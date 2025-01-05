import { Component } from '@angular/core';
import { FloatingWindowService } from '../floating-window.service';

@Component({
  selector: 'app-route',
  templateUrl: './route.component.html',
  styleUrl: './route.component.css'
})
export class RouteComponent {
  constructor(private floatingWindowService: FloatingWindowService) {}

  closeWindow() {
    this.floatingWindowService.close();
  }
}
