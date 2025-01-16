// src/app/public/services/navigation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapService } from './map.service';
import { RoutesService } from './routes.service';

declare var google: any;

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  
  /*------------------------------------------
  Constants and Bounds
  --------------------------------------------*/

  // Define bounds for Clark
  public clarkBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(15.15350883733786, 120.4702890088466),
    new google.maps.LatLng(15.24182812878962, 120.5925078185926)
  );

  // Route Colors
  private routes = {
    J1: { color: "#228B22" },
    J2: { color: "#D4B895" },
    J3: { color: "#1d58c6" },
    J5: { color: "#CE0000" },
    B1: { color: "#F98100" },
  };

  /*------------------------------------------
  User-defined Locations
  --------------------------------------------*/

  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;

  constructor(
    private mapService: MapService,
    private routesService: RoutesService,
    private http: HttpClient
  ) {}

  /*------------------------------------------
  Route Navigation
  --------------------------------------------*/

  /**
   * Main function to navigate to the destination.
   */
  navigateToDestination(): void {
    if (!this.validateLocations()) return;

    this.mapService.clearMap();

    const nearestStartWaypoint = this.routesService.findNearestStop(this.currentLocation!);
    const nearestEndWaypoint = this.routesService.findNearestStop(this.destination!);

    if (!nearestStartWaypoint || !nearestEndWaypoint) {
      alert('No nearby waypoints found for either current location or destination.');
      return;
    }

    console.log('Nearest start waypoint:', nearestStartWaypoint);
    console.log('Nearest end waypoint:', nearestEndWaypoint);

    this.mapService.displayWalkingPath(this.currentLocation!, nearestStartWaypoint, 'NB');

    const routePaths = this.routesService.findAllRoutePaths(nearestStartWaypoint, nearestEndWaypoint);
    const routePath = routePaths.length > 0 ? routePaths[0] : { path: [], color: '' };

    if (routePath.path.length === 0) {
      alert('No route found connecting the selected stops.');
      return;
    }

    this.mapService.displayRouteSegments({ path: routePath.path, color: routePath.color });

    const finalDestination = this.routesService.isNearby(
      this.destination!,
      routePath.path[routePath.path.length - 1]
    )
      ? this.destination!
      : routePath.path[routePath.path.length - 1];

    this.mapService.displayWalkingPath(finalDestination, this.destination!, routePath.color);
  }

  /*------------------------------------------
  Location Validation
  --------------------------------------------*/

  /**
   * Validates the current location and destination to ensure they are set and within bounds.
   */
  private validateLocations(): boolean {
    if (!this.currentLocation || !this.destination) {
      alert('Please set both current location and destination.');
      return false;
    }
    if (!this.isWithinClarkBounds(this.currentLocation)) {
      alert('Your current location is not within Clark bounds.');
      return false;
    }
    if (!this.isWithinClarkBounds(this.destination)) {
      alert('Your destination is not within Clark bounds.');
      return false;
    }
    return true;
  }

  /**
   * Checks if a given location is within the predefined Clark bounds.
   * @param location - The location to check.
   * @returns True if within bounds, false otherwise.
   */
  private isWithinClarkBounds(location: google.maps.LatLngLiteral): boolean {
    return this.clarkBounds.contains(new google.maps.LatLng(location.lat, location.lng));
  }
}
