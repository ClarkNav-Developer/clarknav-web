import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GoogleMapsModule } from '@angular/google-maps';
import { JeepneyRouteComponent } from './jeepney-route/jeepney-route.component';
import { BusRouteComponent } from './bus-route/bus-route.component';
import { AnnouncementComponent } from './announcement/announcement.component';
import { FormsModule } from '@angular/forms';

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
    AppRoutingModule,
    GoogleMapsModule,
    HttpClientModule,
    FormsModule,
    PublicModule,
    AdminModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
