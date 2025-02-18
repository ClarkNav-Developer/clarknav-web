import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getAuthenticatedUser().pipe(
    map(user => {
      // Check if user exists, is authenticated, and is an admin
      if (user && user.isAdmin) {
        return true;
      }

      // if (user && user.isAdmin && user.email_verified_at) {
      //   return true;
      // }
      
      // If not admin, redirect to home
      router.navigate(['/']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};