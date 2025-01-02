import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
<<<<<<< HEAD

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
=======
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GoogleMapsModule } from '@angular/google-maps';
import { AccountComponent } from './account/account.component';
import { JeepneyRouteComponent } from './jeepney-route/jeepney-route.component';
import { BusRouteComponent } from './bus-route/bus-route.component';

@NgModule({
  declarations: [
    AppComponent,
    AccountComponent,
    JeepneyRouteComponent,
    BusRouteComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    GoogleMapsModule,
    HttpClientModule // Add HttpClientModule here
>>>>>>> b109598da4ec5d8a64fc4d9f17f2b1732bde8cea
  ],
  providers: [],
  bootstrap: [AppComponent]
})
<<<<<<< HEAD
export class AppModule { }
=======
export class AppModule {}
>>>>>>> b109598da4ec5d8a64fc4d9f17f2b1732bde8cea
