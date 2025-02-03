import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if the user is trying to access the login page
  if (state.url === '/login') {
    return true;
  }

  return authService.getIdentity().pipe(
    map(getIdentity => {
      if (!getIdentity) {
        router.navigate(['/login']);
        return false;
      }
      return true;
    })
  );
};