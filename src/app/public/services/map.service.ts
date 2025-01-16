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

  /*------------------------------------------
  Initialization
  --------------------------------------------*/
  setMap(map: any) {
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
    this.clearRenderers();
  }

  private clearMarkers() {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

  private clearRenderers() {
    this.routeRenderers.forEach(renderer => renderer.setMap(null));
    this.routeRenderers = [];
  }

  addMarker(location: google.maps.LatLngLiteral, title: string) {
    const marker = new google.maps.Marker({
      position: location,
      map: this.map,
      title,
    });
    this.markers.push(marker);
  }

  /*------------------------------------------
  Route Display
  --------------------------------------------*/
  displayRoutes() {
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

  displayRouteUsingDirectionsAPI(waypoints: google.maps.LatLngLiteral[], color: string) {
    if (waypoints.length < 2) return;

    const cacheKey = JSON.stringify(waypoints);
    if (this.directionsCache.has(cacheKey)) {
      this.renderDirections(this.directionsCache.get(cacheKey), color);
      return;
    }

    const waypointsForApi = waypoints.slice(1, -1).map(wp => ({ location: wp }));
    const request = {
      origin: waypoints[0],
      destination: waypoints[waypoints.length - 1],
      waypoints: waypointsForApi,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        this.directionsCache.set(cacheKey, result);
        this.renderDirections(result, color);
      } else {
        console.error('Directions request failed: ', status);
      }
    });
  }

  private renderDirections(result: any, color: string) {
    const renderer = new google.maps.DirectionsRenderer({
      map: this.map,
      preserveViewport: true,
      suppressMarkers: true,
      polylineOptions: { strokeColor: color, strokeWeight: 5 },
    });
    renderer.setDirections(result);
    this.routeRenderers.push(renderer);
  }

  /*------------------------------------------
Route Segment Display (Replacement for displayRoutePath)
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

    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
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
      icons: [{ icon: this.getWalkingIcon(color), offset: '0', repeat: '15px' }],
    });
    path.setMap(this.map);
    this.routeRenderers.push(path);
  }

  private requestWalkingDirections(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, color: string) {
    const request = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.WALKING,
    };

    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
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
      polylineOptions: {
        icons: [{ icon: this.getWalkingIcon(color), offset: '0', repeat: '15px' }],
      },
    });
    renderer.setDirections(result);
    this.routeRenderers.push(renderer);
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
