import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
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
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
