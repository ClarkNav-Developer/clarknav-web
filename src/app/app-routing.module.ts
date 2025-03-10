import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './admin/components/login/login.component'; // Import LoginComponent

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./public/public.module').then((m) => m.PublicModule),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.module').then((m) => m.AdminModule),
    canActivate: [authGuard], // Protect the admin routes with AuthGuard
  },
  { path: 'login', component: LoginComponent }, // Add login route here
  { path: 'reset-password', component: LoginComponent },
  { path: '**', redirectTo: '' }, // Wildcard route for a 404 page can be added here
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }