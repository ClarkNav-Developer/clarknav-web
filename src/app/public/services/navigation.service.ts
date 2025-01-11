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
        this.displayAllJeepneyWaypoints(); // Display waypoints after routes are loaded
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
  
    if (!this.isWithinClarkBounds(this.currentLocation)) {
      alert('Your current location is not within Clark bounds.');
      return;
    }
  
    if (!this.isWithinClarkBounds(this.destination)) {
      alert('Your destination is not within Clark bounds.');
      return;
    }
  
    this.mapService.clearMap();
  
    const nearestStartWaypoint = this.findNearestStop(this.currentLocation);
    const nearestEndWaypoint = this.findNearestStop(this.destination);
  
    if (!nearestStartWaypoint || !nearestEndWaypoint) {
      alert('No nearby waypoints found for either current location or destination.');
      return;
    }
  
    console.log('Nearest start waypoint:', nearestStartWaypoint);
    console.log('Nearest end waypoint:', nearestEndWaypoint);
  
    // Show walking path to the nearest start waypoint
    this.mapService.displayWalkingPath(this.currentLocation, nearestStartWaypoint, 'NB');
  
    // Find the route path between the nearest waypoints
    const routePath = this.findRoutePath(nearestStartWaypoint, nearestEndWaypoint);
  
    if (routePath.path.length === 0) {
      alert('No route found connecting the selected stops.');
      return;
    }
  
    this.mapService.displayRoutePath(routePath);
  
    // Show walking path from the nearest end waypoint to the destination
    const isExtensionDestination = this.jeepneyRoutes.some(route =>
      route.extensions?.some((ext: any) => this.isNearby(this.destination!, this.parseWaypoint(ext.startPoint)))
    );
  
    if (!isExtensionDestination) {
      this.mapService.displayWalkingPath(nearestEndWaypoint, this.destination, routePath.direction);
    }
  }
  

  isWithinClarkBounds(location: google.maps.LatLngLiteral): boolean {
    return this.clarkBounds.contains(new google.maps.LatLng(location.lat, location.lng));
  }

  findNearestStop(location: google.maps.LatLngLiteral): google.maps.LatLngLiteral | null {
    let nearestWaypoint = null;
    let minDistance = Infinity;

    // Prioritize extension waypoints
    this.jeepneyRoutes.forEach(route => {
      route.extensions?.forEach((extension: any) => {
        const extensionStartPoint = this.parseWaypoint(extension.startPoint);
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(location.lat, location.lng),
          new google.maps.LatLng(extensionStartPoint.lat, extensionStartPoint.lng)
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestWaypoint = extensionStartPoint;
        }
      });
    });

    if (minDistance === 0) return nearestWaypoint; // Return immediately if an extension is nearby

    // Check all waypoints
    const allWaypoints = [...this.jeepneyRoutes, ...this.busRoutes]
      .flatMap(route => route.waypoints)
      .map(this.parseWaypoint);

    allWaypoints.forEach(waypoint => {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(location.lat, location.lng),
        new google.maps.LatLng(waypoint.lat, waypoint.lng)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestWaypoint = waypoint;
      }
    });

    return nearestWaypoint;
  }
  

  findRoutePath(
    startWaypoint: google.maps.LatLngLiteral,
    endWaypoint: google.maps.LatLngLiteral
  ): { path: google.maps.LatLngLiteral[]; direction: string } {
    const routes = [...this.jeepneyRoutes, ...this.busRoutes];
    let bestPath: google.maps.LatLngLiteral[] = [];
    let bestDirection = '';
    let minDistance = Infinity;
  
    routes.forEach(route => {
      console.log('Evaluating route:', route.routeName);
  
      let waypoints = route.waypoints.map(this.parseWaypoint);
  
      // Check extensions and integrate them if necessary
      route.extensions?.forEach((extension: any) => {
        const extensionStartPoint = this.parseWaypoint(extension.startPoint);
  
        if (this.isNearby(startWaypoint, extensionStartPoint) || this.isNearby(endWaypoint, extensionStartPoint)) {
          console.log(`Using extension ${extension.extensionId}.`);
  
          const mainRouteCutoffIndex = waypoints.findIndex((wp: google.maps.LatLngLiteral) =>
            this.isNearby(wp, extensionStartPoint)
          );
  
          if (mainRouteCutoffIndex !== -1) {
            waypoints = [
              ...waypoints.slice(0, mainRouteCutoffIndex + 1), // Include up to the extension start point
              ...extension.waypoints.map(this.parseWaypoint) // Add extension waypoints
            ];
          }
        }
      });
  
      const startIndex = waypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, startWaypoint));
      const endIndex = waypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, endWaypoint));
  
      if (startIndex !== -1 && endIndex !== -1) {
        const path = this.findShortestPath(waypoints, startIndex, endIndex);
        const distance = this.calculatePathDistance(path);
  
        if (distance < minDistance) {
          minDistance = distance;
          bestPath = path;
          bestDirection = startIndex < endIndex ? 'NB' : 'SB';
        }
      }
    });
  
    return { path: bestPath, direction: bestDirection };
  }
  

  findShortestPath(waypoints: google.maps.LatLngLiteral[], startIndex: number, endIndex: number): google.maps.LatLngLiteral[] {
    if (startIndex < endIndex) {
      return waypoints.slice(startIndex, endIndex + 1);
    } else {
      return waypoints.slice(endIndex, startIndex + 1).reverse();
    }
  }

  calculatePathDistance(path: google.maps.LatLngLiteral[]): number {
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      distance += google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(path[i].lat, path[i].lng),
        new google.maps.LatLng(path[i + 1].lat, path[i + 1].lng)
      );
    }
    return distance;
  }

  isNearby(location: google.maps.LatLngLiteral, waypoint: google.maps.LatLngLiteral, threshold = 0.02): boolean {
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
    const distance = 6371 * c; // Earth radius in kilometers
  
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

    this.filteredRoutes = routes.filter(route => {
      const hasStartWaypoint = route.waypoints.some((waypoint: string) =>
        this.isNearby(this.currentLocation!, this.parseWaypoint(waypoint))
      ) || route.extensions?.some((ext: any) =>
        this.isNearby(this.currentLocation!, this.parseWaypoint(ext.startPoint))
      );

      const hasEndWaypoint = route.waypoints.some((waypoint: string) =>
        this.isNearby(this.destination!, this.parseWaypoint(waypoint))
      ) || route.extensions?.some((ext: any) =>
        this.isNearby(this.destination!, this.parseWaypoint(ext.startPoint))
      );

      return hasStartWaypoint && hasEndWaypoint;
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

  /*------------------------------------------
  Display All Jeepney Waypoints
  --------------------------------------------*/
  displayAllJeepneyWaypoints() {
    const baseRouteColor = '#1d58c6'; // Blue for the main route
    const extensionColors = ['#FF0000', '#FFA500', '#008000', '#800080']; // Red, Orange, Green, Purple for extensions

    // Iterate through each jeepney route
    this.jeepneyRoutes.forEach((route, routeIndex) => {
      console.log(`Displaying waypoints for route: ${route.routeName}`);

      // Display main route waypoints
      const mainRouteWaypoints = route.waypoints.map(this.parseWaypoint);

      // Use Directions API to display the route on the road
      this.displayRouteUsingDirectionsAPI(mainRouteWaypoints, baseRouteColor);

      // Add markers for main route waypoints
      mainRouteWaypoints.forEach((waypoint: google.maps.LatLngLiteral, index: number) => {
        this.mapService.addMarker(waypoint, `Route ${route.routeName} - Main Waypoint ${index + 1}`);
      });

      // Display extension waypoints, if any
      route.extensions?.forEach((extension: any, extensionIndex: number) => {
        const extensionWaypoints = extension.waypoints.map(this.parseWaypoint);
        const extensionColor = extensionColors[extensionIndex % extensionColors.length]; // Cycle through colors

        // Use Directions API to display the extension route on the road
        this.displayRouteUsingDirectionsAPI(extensionWaypoints, extensionColor);

        // Add markers for extension waypoints
        extensionWaypoints.forEach((waypoint: google.maps.LatLngLiteral, index: number) => {
          this.mapService.addMarker(
            waypoint,
            `Route ${route.routeName} - Extension ${extension.extensionId} Waypoint ${index + 1}`
          );
        });
      });
    });
  }

  /*------------------------------------------
  Display Route Using Directions API
  --------------------------------------------*/
  displayRouteUsingDirectionsAPI(waypoints: google.maps.LatLngLiteral[], color: string) {
    if (waypoints.length < 2) return;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const origin = waypoints[i];
      const destination = waypoints[i + 1];

      const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      };

      const directionsService = new google.maps.DirectionsService();
      directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map: this.mapService.map,
            preserveViewport: true,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: color,
              strokeOpacity: 1.0,
              strokeWeight: 3,
            },
          });
          directionsRenderer.setDirections(result);
        } else {
          console.error('Directions request failed due to ' + status);
        }
      });
    }
  }
  
}