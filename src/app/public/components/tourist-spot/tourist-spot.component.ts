import { Component, Input } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { FloatingWindowService } from '../../../floating-window.service';

@Component({
  selector: 'app-tourist-spot',
  templateUrl: './tourist-spot.component.html',
  styleUrls: ['./tourist-spot.component.css'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({
        opacity: 0
      })),
      transition(':enter, :leave', [
        animate('200ms ease-in-out')
      ])
    ])
  ]
})
export class TouristSpotComponent {
  @Input() touristSpot: any;
  isVisible: boolean = true;

  constructor(private floatingWindowService: FloatingWindowService) {}

  close() {
    this.isVisible = false;
    setTimeout(() => {
      this.floatingWindowService.close();
    }, 200); // Delay the service call to allow the animation to complete
  }
}