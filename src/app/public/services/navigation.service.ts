import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapService } from './map.service';
import { RoutesService } from './routes.service';
import * as mapboxgl from 'mapbox-gl';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  /*------------------------------------------
  Constants and Bounds
  --------------------------------------------*/

  // Define bounds for Clark using Mapbox's LngLatLike
  public clarkBounds = {
    southWest: [120.4702890088466, 15.15350883733786] as mapboxgl.LngLatLike,
    northEast: [120.5925078185926, 15.24182812878962] as mapboxgl.LngLatLike,
  };

  // Route Colors
  private routes = {
    J1: { color: '#228B22' },
    J2: { color: '#D4B895' },
    J3: { color: '#1d58c6' },
    J5: { color: '#CE0000' },
    B1: { color: '#F98100' },
  };

  /*------------------------------------------
  User-defined Locations
  --------------------------------------------*/

  currentLocation: mapboxgl.LngLat | null = null;
  destination: mapboxgl.LngLat | null = null;

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
  async navigateToDestination(): Promise<void> {
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

    // Display walking path from current location to nearest start waypoint
    this.mapService.displayWalkingPath(this.currentLocation!, new mapboxgl.LngLat(nearestStartWaypoint.lng, nearestStartWaypoint.lat), 'NB');

    try {
      // Fetch route paths asynchronously
      const routePaths = await this.routesService.findAllRoutePaths(
        { lat: nearestStartWaypoint.lat, lng: nearestStartWaypoint.lng },
        { lat: nearestEndWaypoint.lat, lng: nearestEndWaypoint.lng }
      );

      if (!routePaths || routePaths.length === 0) {
        alert('No route found connecting the selected stops.');
        return;
      }

      const routePath = routePaths[0];
      const convertedPath = routePath.path.map(point => new mapboxgl.LngLat(point.lng, point.lat));
      this.mapService.displayRouteSegments({ path: convertedPath, color: routePath.color });

      // Determine the final destination
      const finalDestination = this.routesService.isNearby(
        this.destination!,
        routePath.path[routePath.path.length - 1]
      )
        ? this.destination!
        : routePath.path[routePath.path.length - 1];

      // Display walking path from final destination to user-defined destination
      this.mapService.displayWalkingPath(new mapboxgl.LngLat(finalDestination.lng, finalDestination.lat), this.destination!, routePath.color);
    } catch (error) {
      console.error('Error navigating to destination:', error);
      alert('An error occurred while navigating to the destination. Please try again.');
    }
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
  private isWithinClarkBounds(location: mapboxgl.LngLat): boolean {
    const [lng, lat] = [location.lng, location.lat];
    const [southWestLng, southWestLat] = this.clarkBounds.southWest as [number, number];
    const [northEastLng, northEastLat] = this.clarkBounds.northEast as [number, number];

    return (
      lng >= southWestLng &&
      lng <= northEastLng &&
      lat >= southWestLat &&
      lat <= northEastLat
    );
  }
}
