import { Injectable, signal } from '@angular/core';
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

  private readonly idTokenSubject = new BehaviorSubject<string | null>(null);
  readonly idToken$: Observable<string | null> = this.idTokenSubject.asObservable();
  readonly idTokenSignal = signal<string | null>(null);
  readonly isSdkInitialized = signal<boolean>(false);

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
      this.idTokenSubject.next(credential);
      this.idTokenSignal.set(credential);
      this.prepareTokenForServer(credential);
    } else {
      console.error('Respuesta de credencial de Google inválida:', response);
    }
  }

  /**
   * Prepara el token capturado para su posterior envío al servidor (Backend Django).
   */
  private prepareTokenForServer(token: string): void {
    console.log('Token capturado y listo para transmisión al servidor backend:', token.substring(0, 30) + '...');
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
