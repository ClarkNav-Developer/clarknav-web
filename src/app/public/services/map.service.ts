import { Injectable } from '@angular/core';
import { RoutesService } from './routes.service';

declare var google: any;

@Injectable({
  providedIn: 'root',
})
export class MapService {
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

  constructor(private routesService: RoutesService) { }

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

  private clearMarkers() {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

  private clearRouteRenderers() {
    this.routeRenderers.forEach(renderer => renderer.setMap(null));
    this.routeRenderers = [];
  }

  addMarker(location: google.maps.LatLngLiteral, title: string, iconUrl?: string) {
    const marker = new google.maps.Marker({
      position: location,
      map: this.map,
      title,
      icon: iconUrl ? { url: iconUrl, scaledSize: new google.maps.Size(30, 30) } : undefined,
    });
    this.markers.push(marker);
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

    const waypointsForApi = waypoints.slice(1, waypoints.length - 1).map(waypoint => ({ location: waypoint }));

    const request = {
      origin: waypoints[0],
      destination: waypoints[waypoints.length - 1],
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
    path.forEach(waypoint => {
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