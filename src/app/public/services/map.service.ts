import { Injectable } from '@angular/core';
import { RoutesService } from './routes.service';
import { BehaviorSubject } from 'rxjs';

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
  private filteredRoutes: any[] = [];
  private jeepneyRoutes: any[] = [];
  private busRoutes: any[] = [];

  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;

  private routeColors: { [key: string]: string } = {
    J1: '#228B22',
    J2: '#D4B895',
    J3: '#1d58c6',
    J5: '#CE0000',
    B1: '#F98100',
  };

  constructor(private routesService: RoutesService) {}
  
  setMap(map: any) {
    this.map = map;
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      preserveViewport: true,
    });
  }

  clearMap() {
    // Remove all markers
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    // Remove all route renderers
    this.routeRenderers.forEach(renderer => renderer.setMap(null));
    this.routeRenderers = [];
  }

  addMarker(location: google.maps.LatLngLiteral, title: string) {
    const marker = new google.maps.Marker({
      position: location,
      map: this.map,
      title: title,
    });
    this.markers.push(marker);
  }

  displayWalkingPath(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, color: string) {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(origin.lat, origin.lng),
      new google.maps.LatLng(destination.lat, destination.lng)
    );
  
    const threshold = 50; // Distance in meters to switch between direct path and road-following path
    const pathColor = color // Ensure color is passed correctly
  
    if (distance < threshold) {
      // Draw a direct path with proper color
      const walkingPath = new google.maps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: pathColor,
        strokeOpacity: 0, // Set opacity to 0 since icons will be used for dots
        strokeWeight: 2,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.CIRCLE, // Small circle for dotted effect
              scale: 3, // Size of the dots
              fillColor: pathColor, // Use pathColor here
              fillOpacity: 1, // Solid fill for the circles
              strokeOpacity: 1, // Full opacity for the dots
            },
            offset: '0',
            repeat: '15px',
          },
        ],
      });
  
      walkingPath.setMap(this.map);
      this.routeRenderers.push(walkingPath);
    } else {
      // Follow the road
      const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.WALKING,
      };
  
      this.directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          const walkingRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            preserveViewport: true,
            polylineOptions: {
              strokeColor: pathColor, // Ensure the path color is set for the walking path
              strokeOpacity: 0, // Set opacity to 0 since icons will be used for dots
              strokeWeight: 2,
              icons: [
                {
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE, // Small circle for dotted effect
                    scale: 3,
                    fillColor: pathColor, // Use pathColor here
                    fillOpacity: 1,
                    strokeOpacity: 1,
                  },
                  offset: '0',
                  repeat: '15px',
                },
              ],
            },
          });
          walkingRenderer.setDirections(result);
          this.routeRenderers.push(walkingRenderer);
        } else {
          console.error('Walking directions request failed due to ' + status);
        }
      });
    }
  }
  

  displayRoutePath(routePath: { path: google.maps.LatLngLiteral[], color: string }) {
    if (routePath.path.length < 2) {
      console.error("Route path must have at least two waypoints to display a route.");
      return;
    }

    const pathColor = routePath.color; // Blue for NB, Red for SB

    // Iterate through pairs of waypoints and request directions for each segment
    for (let i = 0; i < routePath.path.length - 1; i++) {
      const origin = routePath.path[i];
      const destination = routePath.path[i + 1];

      const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING, // Use TRANSIT for routes
      };

      this.directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          const segmentRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            preserveViewport: true,
            suppressMarkers: true, // Prevent duplicate markers for waypoints
            polylineOptions: {
              strokeColor: pathColor, // Color based on direction
              strokeWeight: 5, // Thickness of the path
            },
          });

          segmentRenderer.setDirections(result);
          this.routeRenderers.push(segmentRenderer);
        } else {
          console.error('Directions request failed for segment ' + i + ' due to ' + status);
        }
      });
    }

    // Add markers for each waypoint along the path
    routePath.path.forEach((waypoint: google.maps.LatLngLiteral) => {
      this.addMarker(waypoint, 'Waypoint');
    });
  }

  /*------------------------------------------
  Route Display
  --------------------------------------------*/
  displayRoutes() {
    this.filteredRoutes.forEach((route) => {
      const filteredWaypoints = route.waypoints.filter((waypoint: string) =>
        this.routesService.isNearby(this.currentLocation!, this.routesService.parseWaypoint(waypoint)) ||
        this.routesService.isNearby(this.destination!, this.routesService.parseWaypoint(waypoint))
      );

      filteredWaypoints.forEach((waypoint: string) => {
        const location = this.routesService.parseWaypoint(waypoint);
        this.addMarker(location, route.routeName);
      });
    });
  }

  displayAllJeepneyWaypoints() {
    const baseRouteColor = '#1d58c6';
    const extensionColors = ['#FF0000', '#FFA500', '#008000', '#800080'];

    this.jeepneyRoutes.forEach((route, routeIndex) => {
      const mainRouteWaypoints = route.waypoints.map(this.routesService.parseWaypoint);
      this.displayRouteUsingDirectionsAPI(mainRouteWaypoints, baseRouteColor);

      mainRouteWaypoints.forEach((waypoint: google.maps.LatLngLiteral, index: number) => {
        this.addMarker(
          waypoint,
          `Route ${route.routeName} - Main Waypoint ${index + 1}`
        );
      });

      route.extensions?.forEach((extension: any, extensionIndex: number) => {
        const extensionWaypoints = extension.waypoints.map(this.routesService.parseWaypoint);
        const extensionColor = extensionColors[extensionIndex % extensionColors.length];
        this.displayRouteUsingDirectionsAPI(extensionWaypoints, extensionColor);

        extensionWaypoints.forEach((waypoint: google.maps.LatLngLiteral, index: number) => {
          this.addMarker(
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
        } else {
          console.error('Directions request failed due to ' + status);
        }
      });
    }
  }
}