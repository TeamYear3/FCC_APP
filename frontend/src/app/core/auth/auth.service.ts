import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: unknown) => void;
          prompt: (notification?: (notification: unknown) => void) => void;
          renderButton: (parent: HTMLElement, options: unknown) => void;
          disableAutoSelect: () => void;
          revoke: (hint: string, callback: () => void) => void;
        };
        oauth2?: unknown;
      };
    };
  }
}

export interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

export interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getNotDisplayedReason: () => string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly scriptUrl = 'https://accounts.google.com/gsi/client';
  private scriptLoaded = false;
  private scriptLoadingPromise: Promise<void> | null = null;

  private readonly idTokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  readonly idToken$: Observable<string | null> = this.idTokenSubject.asObservable();
  readonly idTokenSignal = signal<string | null>(this.getStoredToken());
  readonly isSdkInitialized = signal<boolean>(false);
  readonly userRoleSignal = signal<'admin' | 'tecnico' | 'cliente' | null>(this.extractRoleFromToken(this.getStoredToken()));
  readonly authErrorSignal = signal<string | null>(null);

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  constructor() {
    // Al instanciar, verificamos si ya existe un token en memoria/localStorage para sincronizar el rol
    const token = this.getStoredToken();
    if (token) {
      this.userRoleSignal.set(this.extractRoleFromToken(token));
    }
  }

  private getStoredToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('fcc_auth_token');
    }
    return null;
  }

  /**
   * Inicializa el SDK de Google Identity Services consumiendo las variables de entorno.
   */
  initializeGoogleAuth(): Promise<void> {
    return this.loadGoogleScript().then(() => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        const clientId = environment.googleClientId || '';
        if (!clientId || clientId === 'GOOGLE_OAUTH_CLIENT_ID') {
          console.warn('Google Client ID utilizando valor por defecto de entorno.');
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: GoogleCredentialResponse) => this.handleCredentialResponse(response),
          auto_select: false,
          cancel_on_tap_outside: true
        });

        this.isSdkInitialized.set(true);
      } else {
        throw new Error('Google Identity Services SDK no disponible en window.google');
      }
    });
  }

  /**
   * Captura la respuesta del callback de Google (ID Token credential) y la transmite al servicio.
   */
  handleCredentialResponse(response: GoogleCredentialResponse): void {
    if (response && response.credential) {
      const credential = response.credential;
      this.prepareTokenForServer(credential);
    } else {
      console.error('Respuesta de credencial de Google inválida:', response);
    }
  }

  /**
   * Almacena o limpia el token JWT activo, actualizando los observadores y señales.
   */
  setToken(token: string | null): void {
    this.idTokenSubject.next(token);
    this.idTokenSignal.set(token);
    const role = this.extractRoleFromToken(token);
    this.userRoleSignal.set(role);

    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem('fcc_auth_token', token);
      } else {
        localStorage.removeItem('fcc_auth_token');
      }
    }
  }

  /**
   * Devuelve el token actual activo.
   */
  getToken(): string | null {
    return this.idTokenSignal() || this.idTokenSubject.value || this.getStoredToken();
  }

  /**
   * Verifica si existe una sesión/token activa.
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Decodifica el payload del JWT token almacenado utilizando base64url.
   */
  getDecodedToken(): Record<string, any> | null {
    const token = this.getToken();
    if (!token) return null;
    return this.decodeTokenString(token);
  }

  /**
   * Decodifica un string de token JWT arbitrario.
   */
  private decodeTokenString(token: string | null): Record<string, any> | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error al decodificar JWT token:', error);
      return null;
    }
  }

  /**
   * Extrae el rol del usuario desde el payload del JWT decodificado (admin, tecnico, cliente).
   */
  getUserRole(): 'admin' | 'tecnico' | 'cliente' | null {
    return this.userRoleSignal() || this.extractRoleFromToken(this.getToken());
  }

  private extractRoleFromToken(token: string | null): 'admin' | 'tecnico' | 'cliente' | null {
    if (!token) return null;
    const decoded = this.decodeTokenString(token);
    if (!decoded) return null;
    const role = decoded['rol'] || decoded['role'] || decoded['user_role'];
    if (role === 'admin' || role === 'tecnico' || role === 'cliente') {
      return role;
    }
    return null;
  }

  /**
   * Cierra la sesión activa del usuario y limpia tokens.
   */
  logout(): void {
    const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('fcc_refresh_token') : null;
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout/`, { refresh: refreshToken }).subscribe({
        next: () => console.log('Sesión invalidada en el servidor backend.'),
        error: (err) => console.warn('Error al invalidar token en el servidor:', err)
      });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('fcc_refresh_token');
    }
    this.setToken(null);
  }

  /**
   * Envia el ID token capturado al servidor Backend Django (/api/auth/google/) para validar y emitir SimpleJWT.
   */
  private prepareTokenForServer(token: string): void {
    this.authErrorSignal.set(null);
    this.http.post<{ access: string; refresh: string }>(`${environment.apiUrl}/auth/google/`, { id_token: token })
      .subscribe({
        next: (res) => {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('fcc_refresh_token', res.refresh);
          }
          this.setToken(res.access);
          const role = this.getUserRole() || 'cliente';
          if (role === 'admin') {
            this.router.navigate(['/admin']);
          } else if (role === 'tecnico') {
            this.router.navigate(['/ordenes']);
          } else {
            this.router.navigate(['/transparencia']);
          }
        },
        error: (err) => {
          console.error('Error al verificar credencial en el servidor Backend:', err);
          const msg = err.error?.error || err.error?.detail || 'Error al conectar con el servidor backend.';
          this.authErrorSignal.set(msg);
        }
      });
  }

  /**
   * Renueva el access token expirado consumiendo el refresh token con el Backend Django (/api/auth/token/refresh/).
   */
  refreshToken(): Observable<string | null> {
    const refresh = typeof localStorage !== 'undefined' ? localStorage.getItem('fcc_refresh_token') : null;
    if (!refresh) {
      return new Observable(subscriber => {
        subscriber.next(null);
        subscriber.complete();
      });
    }
    return new Observable(subscriber => {
      this.http.post<{ access: string }>(`${environment.apiUrl}/auth/token/refresh/`, { refresh }).subscribe({
        next: (res) => {
          this.setToken(res.access);
          subscriber.next(res.access);
          subscriber.complete();
        },
        error: (err) => {
          console.error('Error al renovar token de acceso:', err);
          this.logout();
          this.router.navigate(['/autenticacion']);
          subscriber.next(null);
          subscriber.complete();
        }
      });
    });
  }

  /**
   * Despliega el flujo OAuth de Google presionado desde la acción del botón.
   */
  loginWithGoogle(): void {
    if (!this.isSdkInitialized()) {
      console.warn('Intentando inicializar Google SDK antes de desplegar el prompt...');
      this.initializeGoogleAuth().then(() => this.promptGoogleLogin()).catch(err => {
        console.error('Falló la inicialización al presionar login:', err);
      });
      return;
    }
    this.promptGoogleLogin();
  }

  private promptGoogleLogin(): void {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: unknown) => {
        const promptNotif = notification as GooglePromptNotification;
        if (promptNotif?.isNotDisplayed?.() || promptNotif?.isSkippedMoment?.()) {
          console.warn('Google prompt no desplegado o cerrado por el usuario:', promptNotif?.getNotDisplayedReason?.());
        }
      });
    }
  }

  /**
   * Permite renderizar opcionalmente un botón nativo de Google o enlazar con contenedores externos.
   */
  renderButton(element: HTMLElement, options: Record<string, unknown> = { theme: 'outline', size: 'large' }): void {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(element, options);
    }
  }

  /**
   * Carga dinámicamente el script de Google Identity Services si no está pre-cargado.
   */
  private loadGoogleScript(): Promise<void> {
    if (this.scriptLoaded || (typeof window !== 'undefined' && window.google?.accounts?.id)) {
      this.scriptLoaded = true;
      return Promise.resolve();
    }

    if (this.scriptLoadingPromise) {
      return this.scriptLoadingPromise;
    }

    this.scriptLoadingPromise = new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = this.scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = (error) => {
        this.scriptLoadingPromise = null;
        reject(new Error(`Error al cargar el script ${this.scriptUrl}: ${error}`));
      };

      document.head.appendChild(script);
    });

    return this.scriptLoadingPromise;
  }
}
