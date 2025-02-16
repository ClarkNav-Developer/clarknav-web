import { Component, Input } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';

@Component({
  selector: 'app-tourist-spot',
  templateUrl: './tourist-spot.component.html',
  styleUrls: ['./tourist-spot.component.css']
})
export class TouristSpotComponent {
  @Input() touristSpot: any;

  constructor(private floatingWindowService: FloatingWindowService) {}

  close() {
    this.floatingWindowService.close();
  }
}