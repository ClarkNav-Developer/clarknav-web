import { Injectable } from '@angular/core';
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

  displayWalkingPath(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(origin.lat, origin.lng),
      new google.maps.LatLng(destination.lat, destination.lng)
    );

    const threshold = 50; // Distance in meters to switch between direct path and road-following path

    if (distance < threshold) {
      // Draw a direct path
      const walkingPath = new google.maps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: '#00CCCC',
        strokeOpacity: 0, // Set opacity to 0 since icons will be used for dots
        strokeWeight: 2,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.CIRCLE, // Small circle for dotted effect
              scale: 3, // Size of the dots
              fillColor: '#00CCCC', // Green color for the circles
              fillOpacity: 1, // Solid fill for the circles
              strokeOpacity: 1, // Full opacity for the dots
            },
            offset: '0', // Start from the beginning
            repeat: '15px', // Distance between dots
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
              strokeColor: '#00CCCC', // Green color for walking path
              strokeOpacity: 0, // Set opacity to 0 since icons will be used for dots
              strokeWeight: 2, // Thickness of the path
              icons: [
                {
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE, // Small circle for dotted effect
                    scale: 3, // Size of the dots
                    fillColor: '#00CCCC', // Green color for the circles
                    fillOpacity: 1, // Solid fill for the circles
                    strokeOpacity: 1, // Full opacity for the dots
                  },
                  offset: '0', // Start from the beginning
                  repeat: '15px', // Distance between dots
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

  displayRoutePath(routePath: { path: google.maps.LatLngLiteral[], direction: string }) {
    if (routePath.path.length < 2) {
      console.error("Route path must have at least two waypoints to display a route.");
      return;
    }

    const pathColor = routePath.direction === 'NB' ? '#1d58c6' : '#FF0000'; // Blue for NB, Red for SB

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
}