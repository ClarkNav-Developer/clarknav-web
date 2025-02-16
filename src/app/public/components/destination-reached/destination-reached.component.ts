import { Component, Output, EventEmitter } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';
import { NavigationService } from '../../services/navigation/navigation.service';

@Component({
  selector: 'app-destination-reached',
  templateUrl: './destination-reached.component.html',
  styleUrls: ['./destination-reached.component.css']
})
export class DestinationReachedComponent {
  @Output() closeEvent = new EventEmitter<void>();

  constructor(
    private floatingWindowService: FloatingWindowService,
    private navigationService: NavigationService
  ) {}

  close() {
    this.floatingWindowService.close();
    this.closeEvent.emit(); // Emit the event when the close button is clicked
    this.navigationService.triggerStopNavigation(); // Trigger stop navigation
  }
}