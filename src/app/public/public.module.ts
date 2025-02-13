import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PublicRoutingModule } from './public-routing.module';
import { PinchZoomDirective } from '../directives/pinch-zoom.directive';

// Components
import { AboutComponent } from './components/about/about.component';
import { FloatingWindowComponent } from './components/floating-window/floating-window.component';
import { MapComponent } from './components/map/map.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { SearchComponent } from './components/search/search.component';
import { LayoutComponent } from './layout/layout.component';
import { BottomNavigationComponent } from './components/bottom-navigation/bottom-navigation.component';
import { PlannerComponent } from './components/planner/planner.component';
import { RouteComponent } from './components/route/route.component';
import { AccountComponent } from './components/account/account.component';
import { InformationComponent } from './components/information/information.component';

// Services
import { FloatingWindowService } from '../floating-window.service';
import { MapStyleService } from './services/map/map-style.service';
import { MapInstanceService } from './services/map/map-instance.service';
import { TouristSpotComponent } from './components/tourist-spot/tourist-spot.component';

@NgModule({
  declarations: [
    // Layout Components
    LayoutComponent,
    BottomNavigationComponent,

    // Map Components
    MapComponent,
    MapComponent,
    MapComponent,

    // Navigation Components
    NavigationComponent,
    BottomNavigationComponent,

    // Search Components
    SearchComponent,

    // Floating Window Components
    FloatingWindowComponent,

    // Other Components
    AboutComponent,
    PlannerComponent,
    RouteComponent,
    AccountComponent,
    InformationComponent,
    TouristSpotComponent,
    PinchZoomDirective,
  ],
  imports: [
    CommonModule,
    PublicRoutingModule,
    FormsModule,
  ],
  providers: [
    // Services
    FloatingWindowService,
    MapStyleService,
    MapInstanceService,
  ],
  exports: [
    // Exported Components
    MapComponent,
    SearchComponent,
    NavigationComponent,
    FloatingWindowComponent,
    PlannerComponent,
    RouteComponent,
    AccountComponent,
  ]
})
export class PublicModule { }
