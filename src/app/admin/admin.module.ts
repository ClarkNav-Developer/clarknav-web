import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { AdminRoutingModule } from './admin-routing.module';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FaresManagementComponent } from './components/fares-management/fares-management.component';
import { LoginComponent } from './components/login/login.component';
import { RoutesManagementComponent } from './components/routes-management/routes-management.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    LayoutComponent,
    DashboardComponent,
    FaresManagementComponent,
    LoginComponent,
    RoutesManagementComponent

  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    ReactiveFormsModule
  ]
})
export class AdminModule { }