import { Injectable } from '@angular/core';
import { RoutesService } from '../routes/routes.service';
import { TerminalMarkerService } from '../custom-marker/terminal-marker.service';

declare var google: any;

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private realTimeMarker: google.maps.Marker | null = null; // Marker for real-time location
  public map: any;
  private directionsService: any;
  private directionsRenderer: any;

  private markers: google.maps.Marker[] = [];
  private routeRenderers: google.maps.DirectionsRenderer[] = [];
  private directionsCache = new Map<string, any>();

  private routeColors = {
    J1: '#228B22',
    J2: '#D4B895',
    J3: '#1d58c6',
    J5: '#CE0000',
    B1: '#F98100',
  };

  private jeepneyRoutes: any[] = [];
  private filteredRoutes: any[] = [];

  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;
  private currentRoutePath: google.maps.LatLngLiteral[] = []; // Store the current route path
  private currentRouteColor: string = ''; // Store the current route color
  private autoCenterEnabled: boolean = false; // Property to enable or disable auto-centering

  constructor(private routesService: RoutesService, private terminalMarkerService: TerminalMarkerService) { }

  // Caching the directions results
  private getCacheKey(request: any): string {
    return JSON.stringify(request);
  }

  private cacheResponse(request: any, response: any) {
    const key = this.getCacheKey(request);
    localStorage.setItem(key, JSON.stringify(response));
  }

  private getCachedResponse(request: any): any | null {
    const key = this.getCacheKey(request);
    const cachedResponse = localStorage.getItem(key);
    if (cachedResponse) {
      console.log('Directions loaded from cache');
      return JSON.parse(cachedResponse);
    }
    return null;
  }

  /*------------------------------------------
  Initialization
  --------------------------------------------*/
  initializeMap(map: any) {
    this.map = map;
    this.loadAndDisplayTerminals();
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      preserveViewport: true,
    });
  }

  /*------------------------------------------
  Map Utilities
  --------------------------------------------*/
  clearMap() {
    this.clearMarkers();
    this.clearRouteRenderers();
  }

  clearMarkers() {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

  clearRouteRenderers() {
    this.routeRenderers.forEach((renderer) => renderer.setMap(null));
    this.routeRenderers = [];
  }

  addMarker(
    location: google.maps.LatLngLiteral,
    title: string,
    isUser: boolean = false
  ): google.maps.Marker {
    const marker = new google.maps.Marker({
      position: location,
      map: this.map,
      title: title,
      icon: isUser
        ? {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeWeight: 1,
          }
        : undefined, // Default marker for non-user locations
    });
    this.markers.push(marker);
    return marker;
  }

  private loadAndDisplayTerminals() {
    this.terminalMarkerService.getTerminals().subscribe((data: any) => {
      console.log('Terminals response:', data); // Log the response

      if (data && Array.isArray(data.jeepneys) && Array.isArray(data.bus)) {
        const allRoutes = [...data.jeepneys, ...data.bus];
        allRoutes.forEach((route) => {
          if (Array.isArray(route.terminals)) {
            route.terminals.forEach((terminal: any) => {
              if (terminal.coordinates && terminal.coordinates.lat && terminal.coordinates.lng) {
                this.addMarker(
                  { lat: terminal.coordinates.lat, lng: terminal.coordinates.lng },
                  terminal.terminal_name
                );
              } else {
                console.error('Terminal coordinates are missing or incomplete:', terminal);
              }
            });
          } else {
            console.error('Route terminals are not an array:', route);
          }
        });
      } else {
        console.error('Terminals data is not in the expected format:', data);
      }
    });
  }

  /*------------------------------------------
  Route Display
  --------------------------------------------*/
  displayFilteredRoutes() {
    this.filteredRoutes.forEach(route => {
      const relevantWaypoints = this.getRelevantWaypoints(route.waypoints);
      this.addMarkersForRoute(relevantWaypoints, route.routeName);
    });
  }

  private getRelevantWaypoints(waypoints: string[]) {
    return waypoints.filter(waypoint =>
      this.routesService.isNearby(this.currentLocation!, this.routesService.parseWaypoint(waypoint)) ||
      this.routesService.isNearby(this.destination!, this.routesService.parseWaypoint(waypoint))
    );
  }

  private addMarkersForRoute(waypoints: string[], routeName: string) {
    waypoints.forEach(waypoint => {
      const location = this.routesService.parseWaypoint(waypoint);
      this.addMarker(location, routeName);
    });
  }

  displayRouteWithDirectionsAPI(waypoints: google.maps.LatLngLiteral[], color: string) {
    if (waypoints.length < 2) return;

    const waypointBatches = this.routesService.batchWaypoints(waypoints);

    waypointBatches.forEach((batch, index) => {
      const origin = batch[0];
      const destination = batch[batch.length - 1];
      const waypointsForApi = batch.slice(1, batch.length - 1).map(waypoint => ({ location: waypoint }));

      const request = {
        origin,
        destination,
        waypoints: waypointsForApi,
        travelMode: google.maps.TravelMode.DRIVING,
      };

      const cachedResponse = this.getCachedResponse(request);
      if (cachedResponse) {
        this.renderDirections(cachedResponse, color);
        return;
      }

      this.directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          this.cacheResponse(request, result);
          this.renderDirections(result, color);
        } else {
          console.error('Directions request failed due to ' + status);
        }
      });
    });
  }


  private renderDirections(result: any, color: string) {
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      preserveViewport: true,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: color,
        strokeOpacity: 1.0,
        strokeWeight: 3,
      },
    });
    directionsRenderer.setDirections(result);
    this.routeRenderers.push(directionsRenderer);
  }

  setCurrentRoutePath(path: google.maps.LatLngLiteral[], color: string): void {
    this.currentRoutePath = path;
    this.currentRouteColor = color;
  }

  updateRealTimeLocation(data: { lat: number; lng: number }) {
    const position = new google.maps.LatLng(data.lat, data.lng);

    if (!this.realTimeMarker) {
      // Create a new marker for real-time tracking if it doesn't exist
      this.realTimeMarker = new google.maps.Marker({
        position,
        map: this.map,
        title: 'Real-Time Location',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Customize icon
          scaledSize: new google.maps.Size(40, 40), // Adjust size
        },
      });
    } else {
      // Update marker position
      this.realTimeMarker.setPosition(position);
    }

    // Update the route path dynamically
    this.updateRoutePath(position);

    // Center the map on the real-time marker if auto-centering is enabled
    if (this.autoCenterEnabled) {
      this.map.panTo(position);
    }
  }

  enableAutoCenter() {
    this.autoCenterEnabled = true;
  }

  disableAutoCenter() {
    this.autoCenterEnabled = false;
  }

  centerMapOnRealTimeLocation() {
    if (this.realTimeMarker) {
      this.map.panTo(this.realTimeMarker.getPosition());
    }
  }

  removeRealTimeMarker(): void {
    if (this.realTimeMarker) {
      this.realTimeMarker.setMap(null); // Remove the marker from the map
      this.realTimeMarker = null; // Clear the reference
    }
  }
  
  private updateRoutePath(currentPosition: google.maps.LatLng) {
    if (!this.currentRoutePath.length) return;

    // Find the nearest point on the route path to the current position
    let nearestIndex = -1;
    let minDistance = Infinity;

    this.currentRoutePath.forEach((point, index) => {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(currentPosition, new google.maps.LatLng(point.lat, point.lng));
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    // Check if the user has passed the next waypoint
    const THRESHOLD_DISTANCE = 10; // meters
    if (nearestIndex !== -1 && minDistance < THRESHOLD_DISTANCE) {
      // If the user is near the first or last waypoint, do not slice the path
      return;
    }

    // Clear the existing route renderers
    this.clearRouteRenderers();

    // Display the updated route path with the stored route color
    this.displayRouteSegments({ path: this.currentRoutePath, color: this.currentRouteColor });
  }

  /*------------------------------------------
  Route Segment Display
  --------------------------------------------*/
  displayRouteSegments(routePath: { path: google.maps.LatLngLiteral[], color: string }) {
    if (routePath.path.length < 2) {
      console.error("Route path must have at least two waypoints to display a route.");
      return;
    }

    const { path, color } = routePath;

    // Display each segment using Directions API
    for (let i = 0; i < path.length - 1; i++) {
      const segment = { origin: path[i], destination: path[i + 1], color };
      this.displayRouteSegment(segment);
    }

    // Add markers for each waypoint
    path.forEach((waypoint) => {
      this.addMarker(waypoint, 'Waypoint');
    });
  }

  private displayRouteSegment({ origin, destination, color }: { origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, color: string }) {
    const request = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
    };
  
    const cachedResponse = this.getCachedResponse(request);
    if (cachedResponse) {
      this.renderDirections(cachedResponse, color);
      return;
    }
  
    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        this.cacheResponse(request, result);
        this.renderDirections(result, color);
      } else {
        console.error('Directions request failed for segment due to ' + status);
      }
    });
  } 

  /*------------------------------------------
  Walking Path Display
  --------------------------------------------*/
  displayWalkingPath(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, color: string) {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(origin.lat, origin.lng),
      new google.maps.LatLng(destination.lat, destination.lng)
    );

    const request = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.WALKING,
    };

    const cachedResponse = this.getCachedResponse(request);
    if (cachedResponse) {
      this.renderWalkingDirections(cachedResponse, color);
      return;
    }

    if (distance < 50) {
      this.renderStaticWalkingPath(origin, destination, color);
    } else {
      this.requestWalkingDirections(origin, destination, color);
    }
  }


  private renderStaticWalkingPath(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, color: string) {
    const path = new google.maps.Polyline({
      path: [origin, destination],
      geodesic: true,
      strokeColor: 'transparent', // No solid line, walking icons only
      strokeWeight: 0,
      icons: [{ icon: this.getWalkingIcon(color), offset: '0', repeat: '15px' }],
    });
    path.setMap(this.map);
    this.routeRenderers.push(path);

    // Add markers specific to walking path endpoints
    this.addWalkingPathMarker(origin, 'Start', color);
    this.addWalkingPathMarker(destination, 'End', color);
  }


  private requestWalkingDirections(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, color: string) {
    const request = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.WALKING,
    };

    const cachedResponse = this.getCachedResponse(request);
    if (cachedResponse) {
      this.renderWalkingDirections(cachedResponse, color);
      return;
    }

    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        this.cacheResponse(request, result);
        this.renderWalkingDirections(result, color);
      } else {
        console.error('Walking directions request failed: ', status);
      }
    });
  }

  private renderWalkingDirections(result: any, color: string) {
    const renderer = new google.maps.DirectionsRenderer({
      map: this.map,
      preserveViewport: true,
      suppressMarkers: true, // Disable default markers 
      polylineOptions: {
        strokeColor: 'transparent', // No solid line, walking icons only
        strokeWeight: 0,
        icons: [{ icon: this.getWalkingIcon(color), offset: '0', repeat: '15px' }],
      },
    });
    renderer.setDirections(result);
    this.routeRenderers.push(renderer);

    // Add markers for the walking path endpoints
    const route = result.routes[0].legs[0];
    this.addWalkingPathMarker(route.start_location, 'Start', color);
    this.addWalkingPathMarker(route.end_location, 'End', color);
  }

  private addWalkingPathMarker(location: google.maps.LatLngLiteral, label: string, color: string) {
    const svgIcon = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" height="50" width="50" viewBox="0 0 100 100">
        <!-- Outer Circle -->
        <circle cx="50" cy="50" r="48" fill="${color}" />
        <!-- Inner Icon -->
        <path d="m28 90 11.2-56.4-7.2 2.8v13.6h-8v-18.8l20.2-8.6q1.4-.6 2.95-.7t2.95.4q1.4.5 2.65 1.4t2.05 2.3l4 6.4q2.6 4.2 7.05 6.9T76 48v8q-7 0-12.5-2.9t-9.4-7.4l-2.5 12.3 8.4 8v30h-8v-26l-8.4-6.4-7.2 32.4h-8.4Zm26-70q-3.3 0-5.65-2.35T46 18q0-3.3 2.35-5.65T54 10q3.3 0 5.65 2.35T62 18q0 3.3-2.35 5.65T54 20Z" 
          fill="white" 
          transform="translate(10, 10) scale(0.8)" />
      </svg>
    `)}`;
  
    const marker = new google.maps.Marker({
      position: location,
      map: this.map,
      icon: {
        url: svgIcon,
        scaledSize: new google.maps.Size(30, 30), // Marker size
        anchor: new google.maps.Point(15, 15), // Center anchor point at (15,15) for a 30x30 icon
      },
      title: label,
    });
  
    this.markers.push(marker);
  }
  
  private getWalkingIcon(color: string) {
    return {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 3,
      strokeColor: color,
    };
  }
}