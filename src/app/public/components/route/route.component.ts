import { Component } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';

@Component({
  selector: 'app-route',
  templateUrl: './route.component.html',
  styleUrl: './route.component.css'
})
export class RouteComponent {
  constructor(public floatingWindowService: FloatingWindowService) {}

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }
}
