import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';
import { CsrfInterceptor } from './auth/csrf-interceptor';

import { AppRoutingModule } from './app-routing.module';
import { GoogleMapsModule } from '@angular/google-maps';

import { AppComponent } from './app.component';
import { HammerModule } from '@angular/platform-browser';

import { PublicModule } from './public/public.module';
import { AdminModule } from './admin/admin.module';

import { ToastrModule } from 'ngx-toastr';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, 
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    GoogleMapsModule,
    PublicModule,
    AdminModule,
    ReactiveFormsModule,
    HammerModule,
    ToastrModule.forRoot(), // ToastrModule added
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: CsrfInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }