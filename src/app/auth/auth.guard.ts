import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

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