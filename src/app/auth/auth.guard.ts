import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return authService.getIdentity().pipe(
      map(isAuthenticated => {
        if (!isAuthenticated) {
          router.navigate(['/login']);
          return false;
        }
        return true;
      })
    );
  }

  return of(true);
};