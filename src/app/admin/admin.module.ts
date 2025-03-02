import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing.module';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FaresManagementComponent } from './components/fares-management/fares-management.component';
import { LoginComponent } from './components/login/login.component';
import { RoutesManagementComponent } from './components/routes-management/routes-management.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@NgModule({
  declarations: [
    LayoutComponent,
    DashboardComponent,
    FaresManagementComponent,
    LoginComponent,
    RoutesManagementComponent,
    SidebarComponent,
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class AdminModule { }