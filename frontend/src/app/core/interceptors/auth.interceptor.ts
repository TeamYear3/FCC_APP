import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpInterceptorFn,
  HttpHandlerFn,
  HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * AuthInterceptor adjunta el token JWT (si existe) en el encabezado Authorization
 * de cada request HTTP saliente hacia el Backend Django y renueva tokens ante 401 de forma sincronizada.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  private isRefreshing = false;
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    let authReq = request;
    if (token) {
      authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('/auth/')) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            return this.authService.refreshToken().pipe(
              switchMap(newToken => {
                this.isRefreshing = false;
                if (newToken) {
                  this.refreshTokenSubject.next(newToken);
                  const retryReq = request.clone({
                    setHeaders: {
                      Authorization: `Bearer ${newToken}`
                    }
                  });
                  return next.handle(retryReq);
                }
                this.refreshTokenSubject.next(null);
                this.toastService.mostrarError('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
                this.authService.logout(false);
                this.router.navigate(['/autenticacion']);
                return throwError(() => error);
              }),
              catchError(refreshError => {
                this.isRefreshing = false;
                this.refreshTokenSubject.next(null);
                this.toastService.mostrarError('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
                this.authService.logout(false);
                this.router.navigate(['/autenticacion']);
                return throwError(() => refreshError);
              })
            );
          } else {
            return this.refreshTokenSubject.pipe(
              filter(token => token !== null),
              take(1),
              switchMap(token => {
                const retryReq = request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${token}`
                  }
                });
                return next.handle(retryReq);
              })
            );
          }
        }
        return throwError(() => error);
      })
    );
  }
}

let isRefreshingFn = false;
const refreshTokenSubjectFn = new BehaviorSubject<string | null>(null);

export function resetAuthInterceptorFnState(): void {
  isRefreshingFn = false;
  refreshTokenSubjectFn.next(null);
}

export const authInterceptorFn: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);
  const token = authService.getToken();
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        if (!isRefreshingFn) {
          isRefreshingFn = true;
          refreshTokenSubjectFn.next(null);

          return authService.refreshToken().pipe(
            switchMap(newToken => {
              isRefreshingFn = false;
              if (newToken) {
                refreshTokenSubjectFn.next(newToken);
                const retryReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                return next(retryReq);
              }
              refreshTokenSubjectFn.next(null);
              toastService.mostrarError('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
              authService.logout(false);
              router.navigate(['/autenticacion']);
              return throwError(() => error);
            }),
            catchError(refreshError => {
              isRefreshingFn = false;
              refreshTokenSubjectFn.next(null);
              toastService.mostrarError('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
              authService.logout(false);
              router.navigate(['/autenticacion']);
              return throwError(() => refreshError);
            })
          );
        } else {
          return refreshTokenSubjectFn.pipe(
            filter(newToken => newToken !== null),
            take(1),
            switchMap(newToken => {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retryReq);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};

