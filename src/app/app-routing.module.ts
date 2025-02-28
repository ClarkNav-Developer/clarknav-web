import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './admin/components/login/login.component'; // Import LoginComponent
import { adminGuard } from './auth/admin.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./public/public.module').then((m) => m.PublicModule),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule),
    canActivate: [authGuard], // Add both guards
  },
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: LoginComponent },
  // { path: 'verify-email', component: LoginComponent },
  // { path: 'verify-email/:id/:hash', component: LoginComponent },
  { path: 'confirm-password', component: LoginComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }