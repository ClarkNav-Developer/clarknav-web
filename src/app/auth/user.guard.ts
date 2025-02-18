import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';

export const userGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated.pipe(
    map(isAuthenticated => {
      if (!isAuthenticated) {
        router.navigate(['/login']);
        return false;
      }

      const currentUser = authService.currentUserSubject.value;
      if (currentUser?.isUser) {
        return true;
      } else {
        router.navigate(['/']);
        return false;
      }
    })
  );
};