import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Layout Components
import { LayoutComponent } from './layout/layout.component';

// Feature Components
import { MapComponent } from './components/map/map.component';
import { LoginComponent } from '../admin/components/login/login.component';

// Guards
import { authGuard } from '../auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: MapComponent }, // Redirect root to dashboard
      { path: 'login', component: LoginComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule { }
