import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapService } from './map.service';

declare var google: any;

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  // Bounds for Clark
  public clarkBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(15.15350883733786, 120.4702890088466),
    new google.maps.LatLng(15.24182812878962, 120.5925078185926)
  );

  // Route Data
  private jeepneyRoutes: any[] = [];
  private busRoutes: any[] = [];
  private filteredRoutes: any[] = [];

  private routes = {
    "J1": { color: "#228B22" },
    "J2": { color: "#D4B895" },
    "J3": { color: "#1d58c6" },
    "J5": { color: "#CE0000" },
    "B1": { color: "#F98100" },
  };
  

  // User-defined Locations
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;

  constructor(private mapService: MapService, private http: HttpClient) {}

  /*------------------------------------------
  Route Loading
  --------------------------------------------*/
  loadRoutes() {
    console.log('Loading routes from JSON...');
    this.http.get('assets/routes.json').subscribe(
      (data: any) => {
        console.log('Routes loaded:', data);
        this.jeepneyRoutes = data.routes.jeepney;
        this.busRoutes = data.routes.bus;
        // this.displayAllJeepneyWaypoints();
      },
      (error) => {
        console.error('Error loading routes:', error);
      }
    );
  }

  private parseWaypoint(waypoint: string): google.maps.LatLngLiteral {
    const [lat, lng] = waypoint.split(',').map(coord => parseFloat(coord.trim()));
    return { lat, lng };
  }

  calculateDistance(pointA: google.maps.LatLngLiteral, pointB: google.maps.LatLngLiteral): number {
    return google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(pointA.lat, pointA.lng),
      new google.maps.LatLng(pointB.lat, pointB.lng)
    );
  }

  /*------------------------------------------
  Route Navigation
  --------------------------------------------*/
  navigateToDestination() {
    if (!this.validateLocations()) return;

    this.mapService.clearMap();

    const nearestStartWaypoint = this.findNearestStop(this.currentLocation!);
    const nearestEndWaypoint = this.findNearestStop(this.destination!);

    if (!nearestStartWaypoint || !nearestEndWaypoint) {
      alert('No nearby waypoints found for either current location or destination.');
      return;
    }

    console.log('Nearest start waypoint:', nearestStartWaypoint);
    console.log('Nearest end waypoint:', nearestEndWaypoint);

    this.mapService.displayWalkingPath(this.currentLocation!, nearestStartWaypoint, 'NB');

    const routePath = this.findRoutePath(nearestStartWaypoint, nearestEndWaypoint);

    if (routePath.path.length === 0) {
      alert('No route found connecting the selected stops.');
      return;
    }

    this.mapService.displayRoutePath({ path: routePath.path, color: routePath.color });

    if (!this.isNearby(this.destination!, routePath.path[routePath.path.length - 1])) {
      this.mapService.displayWalkingPath(nearestEndWaypoint, this.destination!, routePath.color);
    }
  }

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

  private isWithinClarkBounds(location: google.maps.LatLngLiteral): boolean {
    return this.clarkBounds.contains(new google.maps.LatLng(location.lat, location.lng));
  }

  findNearestStop(location: google.maps.LatLngLiteral): google.maps.LatLngLiteral | null {
    let nearestWaypoint = null;
    let minDistance = Infinity;

    // Include extension waypoints
    this.jeepneyRoutes.forEach(route => {
      route.extensions?.forEach((extension: any) => {
        extension.waypoints.map(this.parseWaypoint).forEach((extensionWaypoint: google.maps.LatLngLiteral) => {
          const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(location.lat, location.lng),
            new google.maps.LatLng(extensionWaypoint.lat, extensionWaypoint.lng)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestWaypoint = extensionWaypoint;
          }
        });
      });
    });

    // Include main route waypoints
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

  private findRoutePath(
    startWaypoint: google.maps.LatLngLiteral,
    endWaypoint: google.maps.LatLngLiteral
  ): { path: google.maps.LatLngLiteral[]; color: string } {
    const routes = [...this.jeepneyRoutes, ...this.busRoutes];
    let bestPath: google.maps.LatLngLiteral[] = [];
    let bestDirection = '';
    let bestColor = '';
    let minDistance = Infinity;
  
    routes.forEach(route => {
      let waypoints = route.waypoints.map(this.parseWaypoint);
  
      // Filter and prioritize extensions based on proximity to the destination
      const relevantExtensions = (route.extensions || [])
        .filter((extension: any) => {
          const extensionStartPoint = this.parseWaypoint(extension.startPoint);
          return (
            this.isNearby(endWaypoint, extensionStartPoint) ||
            extension.waypoints.some((extWaypoint: string) => 
              this.isNearby(endWaypoint, this.parseWaypoint(extWaypoint))
            )
          );
        })
        .sort((a: any, b: any) => {
          const aDistance = this.calculateDistance(endWaypoint, this.parseWaypoint(a.startPoint));
          const bDistance = this.calculateDistance(endWaypoint, this.parseWaypoint(b.startPoint));
          return aDistance - bDistance; // Sort by distance to destination
        });
  
      // Integrate only the closest relevant extension
      if (relevantExtensions.length > 0) {
        const closestExtension = relevantExtensions[0];
        const extensionStartPoint = this.parseWaypoint(closestExtension.startPoint);
  
        const mainRouteCutoffIndex = waypoints.findIndex((wp: google.maps.LatLngLiteral) =>
          this.isNearby(wp, extensionStartPoint)
        );
  
        if (mainRouteCutoffIndex !== -1) {
          waypoints = [
            ...waypoints.slice(0, mainRouteCutoffIndex + 1),
            ...closestExtension.waypoints.map(this.parseWaypoint),
            ...waypoints.slice(mainRouteCutoffIndex + 1)
          ];
        }
      }
  
      // Find the shortest path between start and end waypoints
      const startIndex = waypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, startWaypoint));
      const endIndex = waypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, endWaypoint));
  
      if (startIndex !== -1 && endIndex !== -1) {
        const path = this.findShortestPath(waypoints, startIndex, endIndex);
        const distance = this.calculatePathDistance(path);
        if (distance < minDistance) {
          minDistance = distance;
          bestPath = path;
          // bestDirection = startIndex < endIndex ? 'NB' : 'SB';
          bestColor = route.color; // Dynamically assign color
        }
      }
    });
  
    return { path: bestPath, color: bestColor };
  }
  

  private findShortestPath(
    waypoints: google.maps.LatLngLiteral[],
    startIndex: number,
    endIndex: number
  ): google.maps.LatLngLiteral[] {
    if (startIndex < endIndex) {
      return waypoints.slice(startIndex, endIndex + 1);
    } else {
      return waypoints.slice(endIndex, startIndex + 1).reverse();
    }
  }

  private calculatePathDistance(path: google.maps.LatLngLiteral[]): number {
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      distance += google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(path[i].lat, path[i].lng),
        new google.maps.LatLng(path[i + 1].lat, path[i + 1].lng)
      );
    }
    return distance;
  }

  private isNearby(
    location: google.maps.LatLngLiteral,
    waypoint: google.maps.LatLngLiteral,
    threshold = 0.02
  ): boolean {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(location.lat, location.lng),
      new google.maps.LatLng(waypoint.lat, waypoint.lng)
    );
    return distance <= threshold * 1000; // Convert threshold to meters
  }

  /*------------------------------------------
  Walking Path Integration
  --------------------------------------------*/
  displayWalkingPath(
    start: google.maps.LatLngLiteral,
    end: google.maps.LatLngLiteral,
    direction: string
  ) {
    this.mapService.displayWalkingPath(start, end, direction);
  }

  /*------------------------------------------
  Route Display
  --------------------------------------------*/
  displayRoutes() {
    this.filteredRoutes.forEach((route) => {
      const filteredWaypoints = route.waypoints.filter((waypoint: string) =>
        this.isNearby(this.currentLocation!, this.parseWaypoint(waypoint)) ||
        this.isNearby(this.destination!, this.parseWaypoint(waypoint))
      );

      filteredWaypoints.forEach((waypoint: string) => {
        const location = this.parseWaypoint(waypoint);
        this.mapService.addMarker(location, route.routeName);
      });
    });
  }

  displayAllJeepneyWaypoints() {
    const baseRouteColor = '#1d58c6';
    const extensionColors = ['#FF0000', '#FFA500', '#008000', '#800080'];

    this.jeepneyRoutes.forEach((route, routeIndex) => {
      const mainRouteWaypoints = route.waypoints.map(this.parseWaypoint);
      this.displayRouteUsingDirectionsAPI(mainRouteWaypoints, baseRouteColor);

      mainRouteWaypoints.forEach((waypoint: google.maps.LatLngLiteral, index: number) => {
        this.mapService.addMarker(
          waypoint,
          `Route ${route.routeName} - Main Waypoint ${index + 1}`
        );
      });

      route.extensions?.forEach((extension: any, extensionIndex: number) => {
        const extensionWaypoints = extension.waypoints.map(this.parseWaypoint);
        const extensionColor = extensionColors[extensionIndex % extensionColors.length];
        this.displayRouteUsingDirectionsAPI(extensionWaypoints, extensionColor);

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