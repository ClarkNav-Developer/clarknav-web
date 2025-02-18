import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const csrfToken = this.getCsrfToken();
        console.log('Extracted CSRF Token:', csrfToken); // Debugging log

        if (csrfToken) {
            const cloned = req.clone({
                headers: req.headers.set('X-XSRF-TOKEN', csrfToken) // Use X-XSRF-TOKEN
            });
            console.log('Request headers with CSRF token:', cloned.headers); // Debugging log
            return next.handle(cloned);
        } else {
            console.warn('CSRF token not found in cookies'); // Debugging log
            return next.handle(req);
        }
    }

    private getCsrfToken(): string | null {
        const name = 'XSRF-TOKEN=';
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    }
}