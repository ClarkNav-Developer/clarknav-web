import { Component } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';

@Component({
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.css']
})
export class BottomNavigationComponent {
  constructor(public floatingWindowService: FloatingWindowService) {}

  openPlannerComponent() {
    this.floatingWindowService.open('planner');
  }

  openRouteComponent() {
    this.floatingWindowService.open('route');
  }

  openAccountComponent() {
    this.floatingWindowService.open('account');
  }
}