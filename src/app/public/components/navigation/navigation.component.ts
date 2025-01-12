import { Component, OnInit } from '@angular/core';
import { NavigationService } from '../../services/navigation.service';

declare var google: any;

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {

  constructor(private navigationService: NavigationService) {}

  ngOnInit(): void {
    this.navigationService.loadRoutes();
  }

  navigateToDestination() {
    this.navigationService.navigateToDestination();
  }
}