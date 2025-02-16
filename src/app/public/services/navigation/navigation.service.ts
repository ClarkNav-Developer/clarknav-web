import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MapService } from '../map/map.service';
import { RoutesService } from '../routes/routes.service';
import { WebsocketService } from '../websocket/websocket.service';
import { GoogleMapsLoaderService } from '../geocoding/google-maps-loader.service';
import { FloatingWindowService } from '../../../floating-window.service';

declare var google: any;

@Injectable({
  providedIn: 'root',
})
export class NavigationService {

  private watchId: number | null = null; // To store the ID of the watchPosition listener
  private userMarker: google.maps.Marker | null = null; // Marker for the user's current location
  private locationUpdateInterval: any = null; // Interval for updating the location
  private destinationReached: boolean = false; // Flag to indicate if the destination is reached

  private stopNavigationSubject = new Subject<void>();
  stopNavigation$ = this.stopNavigationSubject.asObservable();

  /*------------------------------------------
  Constants and Bounds
  --------------------------------------------*/

  // Define bounds for Clark
  public clarkBounds!: google.maps.LatLngBounds;

  // Route Colors
  private routes = {
    J1: { color: "#228B22" },
    J2: { color: "#D4B895" },
    J3: { color: "#1d58c6" },
    J5: { color: "#CE0000" },
    B1: { color: "#F98100" },
  };

  // Caching for route paths
  private directionsCache = new Map<string, any>();

  /*------------------------------------------
  User-defined Locations
  --------------------------------------------*/

  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;

  // Add GoogleMapsLoaderService to the constructor
  constructor(
    private mapService: MapService,
    private routesService: RoutesService,
    private http: HttpClient,
    private ngZone: NgZone,
    private websocketService: WebsocketService,
    private googleMapsLoader: GoogleMapsLoaderService, // Add this line
    private floatingWindowService: FloatingWindowService
  ) {
    this.googleMapsLoader.load().then(() => {
      this.clarkBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(15.15350883733786, 120.4702890088466),
        new google.maps.LatLng(15.24182812878962, 120.5925078185926)
      );
      this.websocketService.subscribeToRealTimeTracking((data) => {
        this.ngZone.run(() => {
          console.log('Processing real-time location update from WebSocket:', data);
          this.mapService.updateRealTimeLocation(data);
        });
      });
    }).catch(error => {
      console.error('Error loading Google Maps API:', error);
    });
  }

  /*------------------------------------------
  Route Navigation
  --------------------------------------------*/

  // Caching for route paths avoiding multiple API calls
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
      console.log('Navigation route loaded from cache');
      return JSON.parse(cachedResponse);
    }
    return null;
  }

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

    // Use route color for walking path
    const routePaths = this.routesService.findAllRoutePaths(nearestStartWaypoint, nearestEndWaypoint);
    const routePath = routePaths.length > 0 ? routePaths[0] : { path: [], color: '' };

    if (routePath.path.length === 0) {
      alert('No route found connecting the selected stops.');
      return;
    }

    // Display walking path from current location to the nearest start waypoint
    this.mapService.displayWalkingPath(this.currentLocation!, nearestStartWaypoint, routePath.color);

    // Display the initial route segments
    this.mapService.displayRouteSegments({ path: routePath.path, color: routePath.color });

    const finalDestination = this.routesService.isNearby(
      this.destination!,
      routePath.path[routePath.path.length - 1]
    )
      ? this.destination!
      : routePath.path[routePath.path.length - 1];

    // Display walking path from the end of the route path to the destination
    this.mapService.displayWalkingPath(finalDestination, this.destination!, routePath.color);

    // Set the initial route path in the MapService with the route color
    this.mapService.setCurrentRoutePath(routePath.path, routePath.color);

    // Enable auto-centering and center the map on the user's real-time location
    this.mapService.enableAutoCenter();
    this.mapService.centerMapOnRealTimeLocation();
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

  /**
   * Start real-time tracking of the user's location.
   */
  startRealTimeTracking(): void {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.ngZone.run(() => {
          const { latitude, longitude } = position.coords;
          const newLocation: google.maps.LatLngLiteral = { lat: latitude, lng: longitude };

          this.currentLocation = newLocation;

          if (!this.userMarker) {
            this.userMarker = this.mapService.addMarker(newLocation, 'User', true);
          } else {
            this.userMarker.setPosition(new google.maps.LatLng(latitude, longitude));
          }

          this.mapService.updateRealTimeLocation(newLocation);

          this.checkProximityToDestination(newLocation);
        });
      },
      (error) => {
        console.error('Error fetching real-time location:', error);
        alert('Unable to fetch real-time location. Please ensure location services are enabled.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    this.locationUpdateInterval = setInterval(() => {
      if (this.currentLocation) {
        this.mapService.updateRealTimeLocation(this.currentLocation);
      }
    }, 10000);
  }

  private checkProximityToDestination(currentLocation: google.maps.LatLngLiteral): void {
    if (!this.destination) return;

    const distanceToDestination = this.routesService.calculateDistance(currentLocation, this.destination);

    if (distanceToDestination < 200 && !this.destinationReached) {
      navigator.vibrate([200, 100, 200, 100, 200]); // Vibrate when nearing the destination
      this.destinationReached = true;
    }

    if (distanceToDestination < 100 && !this.destinationReached) {
      navigator.vibrate([200, 100, 200, 100, 200]); // Vibrate when nearing the destination
      this.destinationReached = true;
    }

    if (distanceToDestination < 20) {
      this.showDestinationReachedPopup();
      this.stopRealTimeTracking();
    }
  }

  private showDestinationReachedPopup(): void {
    this.floatingWindowService.open('destination-reached');
  }

  /**
   * Stop real-time tracking of the user's location.
   */
  stopRealTimeTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;

      if (this.userMarker) {
        this.userMarker.setMap(null); // Remove the marker from the map
        this.userMarker = null;
      }

      console.log('Real-time tracking stopped.');
    }

    // Clear the interval
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }

  /**
   * Stop navigation.
   */
  triggerStopNavigation() {
    this.stopNavigationSubject.next();
  }
}