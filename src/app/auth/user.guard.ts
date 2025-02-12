import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';

export const userGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return of(true); 
  }

  if (authService.getCurrentUser()?.isAdmin) {
    router.navigate(['/admin/admin-dashboard']);
    return false;
  }

  return of(true);
};