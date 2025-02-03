import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FaresManagementComponent } from './components/fares-management/fares-management.component';
import { RoutesManagementComponent } from './components/routes-management/routes-management.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'admin-dashboard', component: DashboardComponent },
      { path: 'fares-management', component: FaresManagementComponent },
      { path: 'routes-management', component: RoutesManagementComponent },
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }