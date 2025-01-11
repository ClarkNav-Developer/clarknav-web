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


@NgModule({
  declarations: [
    MapComponent,
    SearchComponent,
    NavigationComponent,
    FloatingWindowComponent,
    AboutComponent,
    LayoutComponent,
    BottomNavigationComponent
  ],
  imports: [
    CommonModule,
    PublicRoutingModule
  ],
  exports: [
    MapComponent,
    SearchComponent,
    NavigationComponent,
    FloatingWindowComponent
  ]
})
export class PublicModule { }
