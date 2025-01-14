import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PublicRoutingModule } from './public-routing.module';
import { AboutComponent } from './components/about/about.component';
import { FloatingWindowComponent } from './components/floating-window/floating-window.component';
import { MapComponent } from './components/map/map.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { SearchComponent } from './components/search/search.component';
import { LayoutComponent } from './layout/layout.component';
import { BottomNavigationComponent } from './components/bottom-navigation/bottom-navigation.component';
import { FloatingWindowService } from '../floating-window.service';
import { PlannerComponent } from './components/planner/planner.component';
import { RouteComponent } from './components/route/route.component';
import { AccountComponent } from './components/account/account.component';
// import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    MapComponent,
    SearchComponent,
    NavigationComponent,
    FloatingWindowComponent,
    AboutComponent,
    LayoutComponent,
    BottomNavigationComponent,
    PlannerComponent,
    RouteComponent,
    AccountComponent,
  ],
  imports: [
    CommonModule,
    PublicRoutingModule,
    // FormsModule,
  ],
  providers: [FloatingWindowService],
  exports: [
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
