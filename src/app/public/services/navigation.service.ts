import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapService } from './map.service';

declare var google: any;

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;
  clarkBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(15.15350883733786, 120.4702890088466),  // Southwest coordinates of Clark
    new google.maps.LatLng(15.24182812878962, 120.5925078185926)   // Northeast coordinates of Clark
  );

  jeepneyRoutes: any[] = [];
  busRoutes: any[] = [];
  filteredRoutes: any[] = [];

  constructor(private mapService: MapService, private http: HttpClient) {}

  /*------------------------------------------
  Load Routes from JSON
  --------------------------------------------*/
  loadRoutes() {
    console.log('Loading routes from JSON...');
    this.http.get('assets/routes.json').subscribe(
      (data: any) => {
        console.log('Routes loaded:', data);
        this.jeepneyRoutes = data.routes.jeepney;
        this.busRoutes = data.routes.bus;
      },
      (error) => {
        console.error('Error loading routes:', error);
      }
    );
  }

  navigateToDestination() {
    if (!this.currentLocation || !this.destination) {
      alert('Please set both current location and destination.');
      return;
    }

    // Check if current location and destination are within Clark bounds
    if (!this.isWithinClarkBounds(this.currentLocation)) {
      alert('Your current location is not within Clark bounds.');
      return;
    }

    if (!this.isWithinClarkBounds(this.destination)) {
      alert('Your destination is not within Clark bounds.');
      return;
    }

    // Clear the map before displaying new routes
    this.mapService.clearMap();

    const nearestStartWaypoint = this.findNearestStop(this.currentLocation);
    const nearestEndWaypoint = this.findNearestStop(this.destination);

    if (!nearestStartWaypoint || !nearestEndWaypoint) {
      alert('No nearby waypoints found for either current location or destination.');
      return;
    }

    // Show walking path to the nearest start waypoint
    this.mapService.displayWalkingPath(this.currentLocation, nearestStartWaypoint);

    // Find the route path between the nearest waypoints
    const routePath = this.findRoutePath(nearestStartWaypoint, nearestEndWaypoint);
    if (routePath.path.length === 0) {
      alert('No route found connecting the selected stops.');
      return;
    }
    this.mapService.displayRoutePath(routePath);

    // Show walking path from the nearest end waypoint to the destination
    this.mapService.displayWalkingPath(nearestEndWaypoint, this.destination);
  }

  isWithinClarkBounds(location: google.maps.LatLngLiteral): boolean {
    return this.clarkBounds.contains(new google.maps.LatLng(location.lat, location.lng));
  }

  findNearestStop(location: google.maps.LatLngLiteral): google.maps.LatLngLiteral | null {
    const allWaypoints = [...this.jeepneyRoutes, ...this.busRoutes]
      .flatMap((route) => route.waypoints)
      .map(this.parseWaypoint);

    let nearestWaypoint = null;
    let minDistance = Infinity;

    allWaypoints.forEach((waypoint) => {
      const distance = Math.sqrt(
        Math.pow(location.lat - waypoint.lat, 2) + Math.pow(location.lng - waypoint.lng, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestWaypoint = waypoint;
      }
    });

    return nearestWaypoint;
  }

  findRoutePath(startWaypoint: google.maps.LatLngLiteral, endWaypoint: google.maps.LatLngLiteral): { path: google.maps.LatLngLiteral[], direction: string } {
    const isNorthbound = startWaypoint.lat < endWaypoint.lat;  // Current location is south of destination, so traveling northbound
    const isSouthbound = startWaypoint.lat > endWaypoint.lat;  // Current location is north of destination, so traveling southbound

    for (const route of [...this.jeepneyRoutes, ...this.busRoutes]) {
      const startIndex = route.waypoints.findIndex(
        (waypoint: string) => this.isNearby(this.parseWaypoint(waypoint), startWaypoint)
      );
      const endIndex = route.waypoints.findIndex(
        (waypoint: string) => this.isNearby(this.parseWaypoint(waypoint), endWaypoint)
      );

      // Check if both waypoints are on the same route
      if (startIndex !== -1 && endIndex !== -1) {
        if (isNorthbound) {
          // For Northbound Routes: Start comes before End (startIndex <= endIndex)
          if (startIndex <= endIndex) {
            return { path: route.waypoints.slice(startIndex, endIndex + 1).map(this.parseWaypoint), direction: 'NB' }; // Northbound route
          }
        } else if (isSouthbound) {
          // For Southbound Routes: End comes before Start (startIndex > endIndex)
          if (startIndex >= endIndex) {
            return { path: route.waypoints.slice(endIndex, startIndex + 1).map(this.parseWaypoint).reverse(), direction: 'SB' }; // Southbound route
          }
        }
      }
    }
    return { path: [], direction: '' };
  }

  isNearby(location: google.maps.LatLngLiteral, waypoint: google.maps.LatLngLiteral, threshold = 0.05): boolean {
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const lat1 = toRadians(location.lat);
    const lng1 = toRadians(location.lng);
    const lat2 = toRadians(waypoint.lat);
    const lng2 = toRadians(waypoint.lng);

    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = 6371 * c; // Radius of Earth in kilometers

    return distance <= threshold;
  }

  parseWaypoint(waypoint: string): google.maps.LatLngLiteral {
    const [lat, lng] = waypoint.split(',').map(coord => parseFloat(coord.trim()));
    return { lat, lng };
  }

  /*------------------------------------------
  Find Routes Connecting Current Location and Destination
  --------------------------------------------*/
  findRoutes() {
    if (!this.currentLocation || !this.destination) return;

    const routes = [...this.jeepneyRoutes, ...this.busRoutes];

    this.filteredRoutes = routes.filter((route) => {
      const hasStartWaypoint = route.waypoints.some((waypoint: string) => this.isNearby(this.currentLocation!, this.parseWaypoint(waypoint)));
      const hasEndWaypoint = route.waypoints.some((waypoint: string) => this.isNearby(this.destination!, this.parseWaypoint(waypoint)));
      return hasStartWaypoint && hasEndWaypoint; // Only include routes connecting current and destination
    });

    this.displayRoutes();
  }

  /*------------------------------------------
  Display Routes on Map
  --------------------------------------------*/
  displayRoutes() {
    this.filteredRoutes.forEach((route) => {
      const filteredWaypoints = route.waypoints.filter((waypoint: string) =>
        this.isNearby(this.currentLocation!, this.parseWaypoint(waypoint)) || this.isNearby(this.destination!, this.parseWaypoint(waypoint))
      );

      // Add markers for only the relevant waypoints
      filteredWaypoints.forEach((waypoint: string) => {
        const location = this.parseWaypoint(waypoint);
        this.mapService.addMarker(location, route.routeName);
      });
    });
  }
}