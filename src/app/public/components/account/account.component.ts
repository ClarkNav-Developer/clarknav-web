import { Component } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent {
  constructor(private floatingWindowService: FloatingWindowService) {}

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }
}
