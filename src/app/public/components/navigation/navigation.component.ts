import { Component, OnInit } from '@angular/core';
import { NavigationService } from '../../services/navigation.service';
import { RoutesService } from '../../services/routes.service';

declare var google: any;

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {

  constructor(private navigationService: NavigationService, private routesService: RoutesService) {}

  ngOnInit(): void {
    // this.routesService.loadRoutes();
  }

  navigateToDestination() {
    this.navigationService.navigateToDestination();
  }
}