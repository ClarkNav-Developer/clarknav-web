import { Component } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';
import { MapService } from '../../services/map.service';
import { RoutesService } from '../../services/routes.service';

@Component({
  selector: 'app-route',
  templateUrl: './route.component.html',
  styleUrl: './route.component.css'
})
export class RouteComponent {
  showRouteList: boolean = true;
  showBackground: boolean = true;
  currentRouteName: string = '';
  currentRouteType: string = '';

  constructor(
    public floatingWindowService: FloatingWindowService,
    private mapService: MapService,
    private routesService: RoutesService
  ) {}

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }

  renderRoute(routeId: string) {
    const route = this.routesService.getRouteById(routeId);
    if (route) {
      const mainWaypoints = route.waypoints.map(this.routesService.parseWaypoint);
      const routeColor = route.color;
      this.mapService.displayRoutePath({ path: mainWaypoints, color: routeColor });

      // Display extension routes
      route.extensions?.forEach((extension: any) => {
        const extensionWaypoints = extension.waypoints.map(this.routesService.parseWaypoint);
        this.mapService.displayRoutePath({ path: extensionWaypoints, color: routeColor });
      });

      this.currentRouteName = route.routeName; // Update the current route name
      this.currentRouteType = routeId.startsWith('J') ? 'Jeepney' : 'Bus'; // Determine the route type
      this.showRouteList = false; // Hide the route list
      this.showBackground = false; // Hide the background
    } else {
      console.error(`Route ${routeId} not found`);
    }
  }

  renderRoute1() {
    this.renderRoute('J1');
  }

  renderRoute2() {
    this.renderRoute('J2');
  }

  renderRoute3() {
    this.renderRoute('J3');
  }

  renderRoute5() {
    this.renderRoute('J5');
  }

  renderRoute6() {
    this.renderRoute('J6');
  }

  renderRoute7() {
    this.renderRoute('B1');
  }

  renderRoute8() {
    this.renderRoute('B1');
  }

  showRouteListAgain() {
    this.mapService.clearMap(); // Clear the rendered route
    this.showRouteList = true;
    this.showBackground = true; // Show the background
    this.currentRouteName = ''; // Clear the current route name
    this.currentRouteType = ''; // Clear the current route type
  }
}