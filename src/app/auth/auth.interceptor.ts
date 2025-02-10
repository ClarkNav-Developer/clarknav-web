import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { TokenService } from './token.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshTokenInProgress = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private tokenService: TokenService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authToken = this.tokenService.getToken();
    let authReq = req;

    if (authToken) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${authToken}`)
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.refreshTokenInProgress) {
          this.refreshTokenInProgress = true;
          this.refreshTokenSubject.next(null);

          return this.tokenService.refreshToken().pipe(
            switchMap((response: any) => {
              this.refreshTokenInProgress = false;
              const newToken = this.tokenService.getToken();
              if (newToken) {
                this.refreshTokenSubject.next(newToken);
                authReq = req.clone({
                  headers: req.headers.set('Authorization', `Bearer ${newToken}`)
                });
                return next.handle(authReq);
              } else {
                this.tokenService.clearTokens();
                this.router.navigate(['/login']);
                return throwError(error);
              }
            }),
            catchError((refreshError) => {
              this.refreshTokenInProgress = false;
              this.tokenService.clearTokens();
              this.router.navigate(['/login']);
              return throwError(refreshError);
            })
          );
        } else {
          return throwError(error);
        }
      })
    );
  }
}