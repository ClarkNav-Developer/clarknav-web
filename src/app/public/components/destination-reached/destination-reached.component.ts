import { Component, Output, EventEmitter } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';

@Component({
  selector: 'app-destination-reached',
  templateUrl: './destination-reached.component.html',
  styleUrls: ['./destination-reached.component.css']
})
export class DestinationReachedComponent {
  @Output() closeAndStopNavigation = new EventEmitter<void>();

  constructor(private floatingWindowService: FloatingWindowService) {}

  close() {
    this.floatingWindowService.close();
    this.closeAndStopNavigation.emit();
  }
}