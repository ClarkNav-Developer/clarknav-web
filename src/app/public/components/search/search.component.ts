import { Component, OnInit, AfterViewInit, Renderer2, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MapService } from '../../services/map/map.service';
import { NavigationService } from '../../services/navigation/navigation.service';
import { SuggestedRoutesService } from '../../services/routes/suggested-routes.service';
import { GeocodingService } from '../../services/geocoding/geocoding.service';
import { BottomSheetService } from '../../services/bottom-sheet/bottom-sheet.service';
import { FareService } from '../../services/fare/fare.service';
import { LocationService } from '../../services/geocoding/location.service';
import { FloatingWindowService } from '../../../floating-window.service';
import { RoutesService } from '../../services/routes/routes.service';
import { Router } from '@angular/router';
import { GoogleMapsLoaderService } from '../../services/geocoding/google-maps-loader.service';
import { AuthService } from '../../../auth/auth.service';
import { RouteUsage } from '../../../models/routeusage';

declare var google: any;

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit, AfterViewInit, OnDestroy {
  // Locations and addresses
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;

  // UI state
  showNavigationWindow = false;
  isBottomSheetVisible = false;
  showNavigationStatus = false;
  showAllRoutes = true;
  showSideNav: boolean = true;

  // Route data
  suggestedRoutes: any[] = [];
  selectedRoute: any;
  highlightedRoute: any = null;
  route: any = { duration: null };
  private isNavigationActive: boolean = false;

  // Time data
  currentTime: string = '';
  arrivalTime: string = '';
  private updateDurationInterval: any = null;

  private trackingInterval: any = null;
  // Add a flag to check if a search has been performed
  searchPerformed = false;
  selectedTransportType: string = 'All'; // Track selected transport type

  constructor(
    private mapService: MapService,
    private navigationService: NavigationService,
    private suggestedRoutesService: SuggestedRoutesService,
    private geocodingService: GeocodingService,
    private bottomSheetService: BottomSheetService,
    private fareService: FareService,
    public locationService: LocationService,
    private renderer: Renderer2,
    public floatingWindowService: FloatingWindowService,
    private routesService: RoutesService,
    private router: Router,
    private googleMapsLoader: GoogleMapsLoaderService,
    private authService: AuthService, // Add this line
    private cdr: ChangeDetectorRef // Add ChangeDetectorRef
  ) { 
    this.navigationService.stopNavigation$.subscribe(() => {
      this.stopNavigation();
    });
   }

  /*------------------------------------------
  Lifecycle Hooks
  --------------------------------------------*/
  ngOnInit(): void {
    this.googleMapsLoader.load().then(() => {
      this.initializeAutocomplete();
      this.setupBottomSheetDragging();
      this.bottomSheetService.setRenderer(this.renderer);
      this.locationService.resolveAddresses();
      this.startUpdatingDuration();
    }).catch(error => {
      console.error('Error loading Google Maps API:', error);
    });
  }

  ngAfterViewInit(): void {
    if (!this.mapService) {
      console.error('MapService is not available.');
    }
  }

  ngOnDestroy(): void {
    this.navigationService.stopRealTimeTracking();
    this.stopUpdatingDuration();
  }

  saveRoute(route: any): void {
    if (route) {
      this.router.navigate(['/planner'], { state: { route } });
    } else {
      alert('Please select a route to save.');
    }
  }

  /*------------------------------------------
  UI Controls
  --------------------------------------------*/
  toggleMobileContainer(): void {
    this.bottomSheetService.toggleMobileContainer();
  }

  toggleBottomSheet(): void {
    this.bottomSheetService.toggleBottomSheet();
  }

  hideBottomSheet(): void {
    this.bottomSheetService.hideBottomSheet(this.mapService);
  }

  minimizeBottomSheet(): void {
    this.bottomSheetService.minimizeBottomSheet();
  }

  openInformationComponent() {
    this.floatingWindowService.open('information');
  }

  /*------------------------------------------
  Dragging Logic for Bottom Sheet
  --------------------------------------------*/
  private setupBottomSheetDragging(): void {
    const bottomSheet = document.getElementById('bottomSheet');
    const handle = bottomSheet?.querySelector('.drag-handle');

    if (handle && bottomSheet) {
      this.renderer.listen(handle, 'mousedown', (event: MouseEvent) => this.bottomSheetService.initiateDrag(event, bottomSheet));
      this.renderer.listen(handle, 'touchstart', (event: TouchEvent) => this.bottomSheetService.initiateDrag(event, bottomSheet));
    }
  }

  /*------------------------------------------
  Route and Navigation Logic
  --------------------------------------------*/
  navigateToDestination(): void {
    if (!this.currentLocation || !this.destination) {
      alert('Please set both your current location and destination.');
      return;
    }

    this.locationService.resolveAddresses();
    this.fetchSuggestedRoutes();
    this.navigationService.currentLocation = this.currentLocation;
    this.navigationService.destination = this.destination;
    // this.navigationService.navigateToDestination();

    this.isBottomSheetVisible = true;
    this.searchPerformed = true;
  }

  fetchSuggestedRoutes() {
    if (this.currentLocation && this.destination) {
      const key = JSON.stringify({ currentLocation: this.currentLocation, destination: this.destination });
      const cachedRoutes = localStorage.getItem(key);

      if (cachedRoutes) {
        this.suggestedRoutes = JSON.parse(cachedRoutes);
      } else {
        // Get suggested routes
        const routes = this.suggestedRoutesService.getSuggestedRoutes(this.currentLocation, this.destination);

        // Assign transport type based on `routes.json` category
        this.suggestedRoutes = routes.map((route: any) => ({
          ...route,
          type: this.getTransportType(route.routeId) // Assign transport type
        }));

        localStorage.setItem(key, JSON.stringify(this.suggestedRoutes));
      }

      // Filter routes based on selected transport type
      if (this.selectedTransportType !== 'All') {
        this.suggestedRoutes = this.suggestedRoutes.filter(route => route.type === this.selectedTransportType);
      }

      // Display message if no routes are found
      if (this.suggestedRoutes.length === 0) {
        console.log("No suggested routes found. Please check your input.");
      }

      // Calculate distance, duration, and fare for each route
      this.suggestedRoutes.forEach(route => {
        route.distanceInKm = this.fareService.calculateDistance(route);
        this.fareService.calculateDuration(this.currentLocation!, this.destination!, (duration, arrivalTime) => {
          route.duration = duration;
          route.arrivalTime = arrivalTime;
          console.log('Updated duration:', duration); // Log the updated duration
          console.log('Updated arrival time:', arrivalTime); // Log the updated arrival time
        });
        this.fareService.calculateFare(route);
      });

      // Set the current time when fetching suggested routes
      const now = new Date();
      this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  getTransportType(routeId: string): string {
    const route = this.routesService.getRouteById(routeId);
    if (!route) return 'Unknown';

    if (route.routeId === 'taxi') return 'Taxi'; // Handle taxi route
    if (this.routesService.jeepneyRoutes.includes(route)) return 'Jeepney';
    if (this.routesService.busRoutes.includes(route)) return 'Bus';

    return 'Unknown';
  }

  // Handle transport type selection
  selectTransportType(type: string) {
    this.selectedTransportType = type;
    this.fetchSuggestedRoutes();
  }

  highlightRoute(route: any): void {
    if (this.highlightedRoute !== route) {
      this.highlightedRoute = route;
      this.renderRoutesOnMap(route, false); // Pass false to indicate it's a hover action
    }
  }

  clearHighlight(): void {
    if (this.highlightedRoute && this.highlightedRoute !== this.selectedRoute) {
      this.highlightedRoute = null;
      this.renderRoutesOnMap(this.selectedRoute, true); // Keep the selected route rendered
    }
  }

  private renderRoutesOnMap(route?: any, isSelection: boolean = false): void {
    this.mapService.clearMap();

    if (route) {
      // Render only the provided route
      this.mapService.displayRouteSegments({ path: route.path, color: route.color });

      // Ensure walking paths are displayed for the selected route
      const startWaypoint = route.start;
      const endWaypoint = route.end;
      this.mapService.displayWalkingPath(this.currentLocation!, startWaypoint, route.color);
      this.mapService.displayWalkingPath(endWaypoint, this.destination!, route.color);

      // If it's a selection, keep the route highlighted
      if (isSelection) {
        this.highlightedRoute = route;
      }
    } else if (this.showAllRoutes) {
      // Render all suggested routes
      this.suggestedRoutes.forEach(route => {
        this.mapService.displayRouteSegments({ path: route.path, color: route.color });
      });
    }
  }

  selectRoute(route: any): void {
    this.selectedRoute = route;
    this.route = route;
    this.showAllRoutes = false;
    this.renderRoutesOnMap(route, true); // Pass true to indicate it's a selection action
    this.navigationService.startRealTimeTracking(); // Start real-time tracking
  
    // Save navigation history if the user is authenticated
    if (this.authService.isAuthenticated) {
      console.log('Saving navigation history with the following details:');
      console.log('Origin:', this.locationService.currentLocationAddress);
      console.log('Destination:', this.locationService.destinationAddress);
      console.log('Route Details:', { path: route.path, color: route.color });
  
      this.suggestedRoutesService.saveNavigationHistory(
        this.locationService.currentLocationAddress,
        this.locationService.destinationAddress,
        { path: route.path, color: route.color },
        true
      ).subscribe(response => {
        console.log('Navigation history saved:', response);
      }, error => {
        console.error('Error saving navigation history:', error);
      });
    } else {
      console.log('User is not authenticated. Navigation history will not be saved.');
    }
  
    // Store route usage
    const routeUsage: RouteUsage = {
      created_at: new Date(),
      route_type: route.type,
      route_name: route.name,
      route_id: route.routeId,
      color: route.color,
      origin: this.locationService.currentLocationAddress,
      destination: this.locationService.destinationAddress
    };
  
    console.log('Storing route usage with the following details:');
    console.log('Route Usage:', routeUsage);
  
    this.suggestedRoutesService.storeRouteUsage(routeUsage).subscribe({
      next: (response) => {
        console.log('Route usage stored successfully:', response);
      },
      error: (error) => {
        console.error('Error storing route usage:', error);
      }
    });
  }

  stopRealTimeTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    // Additional logic to stop tracking, if any
  }

  /*------------------------------------------
  Navigation Controls
  --------------------------------------------*/

  startNavigation(): void {
    if (this.selectedRoute) {
      this.navigationService.startRealTimeTracking();
      this.isBottomSheetVisible = false;
      this.showNavigationWindow = false;
      this.showNavigationStatus = true; // Show navigation status
      this.showSideNav = false; // Hide side-nav-mobile

      // Hide the mobile container
      const mobileContainer = document.querySelector('.mobile-container');
      if (mobileContainer) {
        mobileContainer.classList.remove('show');
      }

      // Hide the bottom sheet
      const bottomSheet = document.getElementById('bottomSheet');
      if (bottomSheet) {
        bottomSheet.style.height = '0';
        bottomSheet.classList.remove('show');
      }

      // Set the current time when navigation starts
      const now = new Date();
      this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Start updating duration
      this.isNavigationActive = true;
      this.startUpdatingDuration();
    } else {
      alert('Please select a route to start navigation.');
    }
  }

  stopNavigation(): void {
    console.log('Stopping navigation...');
    this.navigationService.stopRealTimeTracking();
    this.mapService.clearMap(); // Clear all markers and routes rendered on the map
    this.mapService.removeRealTimeMarker(); // Remove the real-time marker
    this.showNavigationStatus = false; // Hide navigation status
    this.showSideNav = true; // Show side-nav-mobile
    this.isNavigationActive = false;
    clearInterval(this.updateDurationInterval);
  
    // Stop updating duration
    this.isNavigationActive = false;
    this.stopUpdatingDuration();
    console.log('Navigation stopped and duration update interval cleared.');
  }

  /*------------------------------------------
  Location Utilities
  --------------------------------------------*/
  reverseLocation(): void {
    this.locationService.reverseLocation();
  }

  useMyLocation(): void {
    this.locationService.useMyLocation();
  }

  private startUpdatingDuration(): void {
    this.updateDurationInterval = setInterval(() => {
      if (this.isNavigationActive && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          this.currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          if (this.currentLocation && this.destination) {
            this.fareService.calculateRemainingDuration(this.currentLocation, this.destination, (duration, arrivalTime) => {
              this.route.duration = duration;
              this.route.arrivalTime = arrivalTime;
              console.log('Updated duration:', duration); // Log the updated duration
              console.log('Updated arrival time:', arrivalTime); // Log the updated arrival time
              this.cdr.detectChanges(); // Trigger change detection
            });
          }
        }, (error) => {
          console.error('Error getting current position:', error);
        });
      } else {
        console.error('Geolocation is not supported by this browser.');
      }
    }, 10000); // Update every 10 seconds
  }

  private stopUpdatingDuration(): void {
    if (this.updateDurationInterval) {
      clearInterval(this.updateDurationInterval);
      this.updateDurationInterval = null;
      console.log('Duration update interval cleared.');
    } else {
      console.log('No duration update interval to clear.');
    }
  }

  /*------------------------------------------
  Autocomplete Initialization
  --------------------------------------------*/
  private initializeAutocomplete(): void {
    const inputs = [
      'search-box',
      'search-box-2',
      'search-box-mobile',
      'search-box-mobile-2',
      'current-location-box',
      'current-location-box-mobile',
    ].map(id => document.getElementById(id) as HTMLInputElement);

    inputs.forEach(input => {
      if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
          componentRestrictions: { country: 'PH' },
          bounds: this.navigationService.clarkBounds,
          strictBounds: true,
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            // Extract the place name
            const placeName = place.name || 'Unknown Place';

            // Set the input value to the place name
            input.value = placeName;

            if (input.id.includes('current')) {
              this.currentLocation = location;
              this.locationService.currentLocation = location;
            } else {
              this.destination = location;
              this.locationService.destination = location;
            }

            // Only resolve addresses if both currentLocation and destination are set
            if (this.currentLocation && this.destination) {
              this.locationService.resolveAddresses(); // Ensure address is resolved after location selection
              this.mapService.addMarker(location, input.id.includes('current') ? 'Your Location' : 'Destination');
              this.mapService.map.setCenter(location);

              // Fetch suggested routes immediately after setting the locations
              this.fetchSuggestedRoutes();

              // Update the searchPerformed flag
              this.searchPerformed = !!this.currentLocation && !!this.destination;
            }
          }
        });

        // Add event listener to update searchPerformed flag when input changes
        input.addEventListener('input', () => {
          this.searchPerformed = !!this.currentLocation && !!this.destination;
        });
      }
    });
  }
}