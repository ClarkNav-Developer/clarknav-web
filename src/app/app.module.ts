import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule

import { AppRoutingModule } from './app-routing.module';
import { GoogleMapsModule } from '@angular/google-maps';

import { AppComponent } from './app.component';
import { JeepneyRouteComponent } from './jeepney-route/jeepney-route.component';
import { BusRouteComponent } from './bus-route/bus-route.component';
import { AnnouncementComponent } from './announcement/announcement.component';

import { PublicModule } from './public/public.module';
import { AdminModule } from './admin/admin.module';

@NgModule({
  declarations: [
    AppComponent,
    JeepneyRouteComponent,
    BusRouteComponent,
    AnnouncementComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    GoogleMapsModule,
    PublicModule,
    AdminModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
