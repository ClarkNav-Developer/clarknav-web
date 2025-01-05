import { Component } from '@angular/core';
import { FloatingWindowService } from '../floating-window.service';

@Component({
  selector: 'app-planner',
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.css'
})
export class PlannerComponent {
  constructor(private floatingWindowService: FloatingWindowService) {}

  closeWindow() {
    this.floatingWindowService.close();
  }

}
