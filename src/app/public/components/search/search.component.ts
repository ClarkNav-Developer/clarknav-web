import { Component, OnInit, AfterViewInit, Renderer2, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import * as toastr from 'toastr';
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
import { SideNavService } from '../../services/side-nav/side-nav.service';

declare var google: any;

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        transform: 'translateX(0)'
      })),
      state('out', style({
        transform: 'translateX(-110%)'
      })),
      transition('out => in', [
        animate('200ms ease-in')
      ]),
      transition('in => out', [
        animate('200ms ease-out')
      ])
    ]),
    trigger('slideUpDown', [
      state('down', style({
        transform: 'translateY(0)'
      })),
      state('up', style({
        transform: 'translateY(-170%)'
      })),
      transition('down => up', [
        animate('200ms ease-in')
      ]),
      transition('up => down', [
        animate('200ms ease-out')
      ])
    ])
  ]
})
export class SearchComponent implements OnInit, AfterViewInit, OnDestroy {
  // Locations and addresses
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;
  private currentMarker: google.maps.Marker | null = null; // Add this line

  // UI state
  showNavigationWindow = false;
  isBottomSheetVisible = false;
  showNavigationStatus = false;
  showAllRoutes = true;
  showSideNav: boolean = true;
  containerState: string = 'out';
  searchContainerState: string = 'down';
  searchContainerMobileState: string = 'down';

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
    private cdr: ChangeDetectorRef, // Add ChangeDetectorRef
    private sideNavService: SideNavService // Add SideNavService
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
      this.sideNavService.sideNavVisible$.subscribe(visible => {
        this.showSideNav = visible;
      });
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
    if (!this.authService.isAuthenticated) {
      console.error('Save route failed: User is not logged in.');
      toastr.error('You must be logged in to save a route to the planner.');
      return;
    }
  
    if (route) {
      this.router.navigate(['/planner'], { state: { route } });
      toastr.success('The route has been saved to your route planner.');
    } else {
      console.error('Save route failed: No route selected.');
      toastr.info('Please select a route to save.');
    }
  }

  /*------------------------------------------
  UI Controls
  --------------------------------------------*/
  toggleMobileContainer(): void {
    this.bottomSheetService.toggleMobileContainer();
    this.mapService.clearMarkers(); // Clear the markers on the map

    // Clear the autocomplete inputs and reset locations
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
        input.value = '';
      }
    });

    this.currentLocation = null;
    this.destination = null;
    this.locationService.currentLocation = null;
    this.locationService.destination = null;
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

  toggleContainer(): void {
    this.containerState = this.containerState === 'in' ? 'out' : 'in';
    this.searchContainerState = this.searchContainerState === 'down' ? 'up' : 'down';
    this.mapService.clearMarkers(); // Clear the markers on the map
    this.mapService.clearRouteRenderers(); // Clear the route renderers on the map

    // Clear the autocomplete inputs and reset locations
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
        input.value = '';
      }
    });

    this.currentLocation = null;
    this.destination = null;
    this.locationService.currentLocation = null;
    this.locationService.destination = null;

    // Clear the suggested routes
    this.suggestedRoutes = [];

    // Reset the transport selection
    this.searchPerformed = false;
  }

  toggleSearchContainerMobile(): void {
    this.searchContainerMobileState = this.searchContainerMobileState === 'down' ? 'up' : 'down';
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
      toastr.info('Please set both your current location and destination.');
      this.bottomSheetService.toggleBottomSheet(); // Move this line inside the valid condition

      return;
    }
  
    this.locationService.resolveAddresses();
    this.fetchSuggestedRoutes();
    this.navigationService.currentLocation = this.currentLocation;
    this.navigationService.destination = this.destination;
    this.navigationService.selectedTransportType = this.selectedTransportType; // Pass the selected transport type
  
    // this.isBottomSheetVisible = true;
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
          type: this.getTransportType(route.routeId)
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
        const transportMode = route.type === 'Walking' ? google.maps.TravelMode.WALKING : google.maps.TravelMode.DRIVING;
        this.fareService.calculateDuration(this.currentLocation!, this.destination!, transportMode, (duration, arrivalTime) => {
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
      if (routeId === 'taxi') return 'Taxi'; // Handle taxi route
      if (routeId === 'walking') return 'Walking'; // Ensure walking route is identified
  
      const route = this.routesService.getRouteById(routeId);
      if (!route) return 'Unknown';
  
      if (this.routesService.jeepneyRoutes.includes(route)) return 'Jeepney';
      if (this.routesService.busRoutes.includes(route)) return 'Bus';
  
      return 'Unknown';
  }

  // getSvgPath(routeType: string): string {
  //   switch (routeType) {
  //     case 'Walking':
  //       return 'M352.31-467.69v-295.46L228.54-639.38 200-667.69 372.31-840l172.31 172.31-28.54 28.31-123.77-123.77v295.46h-40ZM586.92-120l-172.3-172.31 28.53-28.31 123.77 123.77v-295.46h40v295.46l123.77-123.77 28.54 28.31L586.92-120Z';
  //     case 'Jeepney':
  //       return 'M19,13V7H20V4H4V7H5V13H2C2,13.93 2.5,14.71 3.5,14.93V20A1,1 0 0,0 4.5,21H5.5A1,1 0 0,0 6.5,20V19H17.5V20A1,1 0 0,0 18.5,21H19.5A1,1 0 0,0 20.5,20V14.93C21.5,14.7 22,13.93 22,13H19M8,15A1.5,1.5 0 0,1 6.5,13.5A1.5,1.5 0 0,1 8,12A1.5,1.5 0 0,1 9.5,13.5A1.5,1.5 0 0,1 8,15M16,15A1.5,1.5 0 0,1 14.5,13.5A1.5,1.5 0 0,1 16,12A1.5,1.5 0 0,1 17.5,13.5A1.5,1.5 0 0,1 16,15M17.5,10.5C15.92,10.18 14.03,10 12,10C9.97,10 8,10.18 6.5,10.5V7H17.5V10.5Z';
  //     case 'Bus':
  //       return 'M240-120q-17 0-28.5-11.5T200-160v-82q-18-20-29-44.5T160-340v-380q0-83 77-121.5T480-880q172 0 246 37t74 123v380q0 29-11 53.5T760-242v82q0 17-11.5 28.5T720-120h-40q-17 0-28.5-11.5T640-160v-40H320v40q0 17-11.5 28.5T280-120h-40Zm0-440h480v-120H240v120Zm100 240q25 0 42.5-17.5T400-380q0-25-17.5-42.5T340-440q-25 0-42.5 17.5T280-380q0 25 17.5 42.5T340-320Zm280 0q25 0 42.5-17.5T680-380q0-25-17.5-42.5T620-440q-25 0-42.5 17.5T560-380q0 25 17.5 42.5T620-320Z';
  //     case 'Taxi':
  //       return 'M226.61-206v46q0 14.45-10.62 24.22-10.63 9.78-25.67 9.78H160.3q-15.05 0-25.67-9.78Q124-145.55 124-160v-318.92L209.69-720q5.11-15.57 18.69-24.78 13.58-9.22 30.24-9.22h109.84v-74.77h224.62V-754h109.84q16.08 0 29.19 9.35 13.12 9.35 18.2 24.65L836-478.92V-160q0 14.45-10.63 24.22Q814.75-126 799.7-126h-30.02q-15.04 0-25.67-9.78-10.62-9.77-10.62-24.22v-46H226.61Zm-4.3-342.92h515.38L689.23-684H270.77l-48.46 135.08Zm74.24 226.77q22.83 0 39.53-16.79 16.69-16.78 16.69-39.61t-16.78-39.53q-16.79-16.69-39.62-16.69t-39.52 16.78q-16.7 16.79-16.7 39.62t16.79 39.52q16.78 16.7 39.61 16.7Zm367.08 0q22.83 0 39.52-16.79 16.7-16.78 16.7-39.61t-16.79-39.53q-16.78-16.69-39.61-16.69t-39.53 16.78q-16.69 16.79-16.69 39.62t16.78 39.52q16.79 16.7 39.62 16.7Z';
  //     default:
  //       return '';
  //   }
  // }

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

  selectRouteForDesktop(route: any): void {
      if (this.selectedRoute === route) {
          this.selectedRoute = null;
          this.route = { duration: null };
          this.showAllRoutes = true;
          this.renderRoutesOnMap(); // Render all routes
          console.log('Cleared selected route and rendered all routes.');
      } else {
          this.selectedRoute = route;
          this.route = route;
          this.showAllRoutes = false;
          this.renderRoutesOnMap(route, true); // Pass true to indicate it's a selection action
          console.log('Selected route:', route);
  
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
      toastr.info('Please select a route to start navigation.');
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
  
    // Define the bounds for Clark
    const clarkBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(15.160, 120.500), // Southwest corner
      new google.maps.LatLng(15.230, 120.600)  // Northeast corner
    );
  
    inputs.forEach(input => {
      if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
          componentRestrictions: { country: 'PH' },
          bounds: clarkBounds,
          strictBounds: true,
        });
  
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry && clarkBounds.contains(place.geometry.location)) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
  
            // Extract the place name
            const placeName = place.name || 'Unknown Place';
  
            // Set the input value to the place name
            input.value = placeName;
  
            // Determine which input field is being used and set the corresponding location
            if (input.id.includes('current')) {
              this.currentLocation = location;
              this.locationService.currentLocation = location;
            } else if (input.id.includes('search-box-2') || input.id.includes('search-box-mobile-2')) {
              this.destination = location;
              this.locationService.destination = location;
            } else {
              this.destination = location;
              this.locationService.destination = location;
            }
  
            // Resolve addresses and add marker for the selected location
            this.locationService.resolveAddresses();
            
            // Remove the current marker if it exists
            if (this.currentMarker) {
              this.currentMarker.setMap(null);
            }
            
            // Add a new marker for the selected location
            this.currentMarker = this.mapService.addMarker(location, input.id.includes('current') ? 'Your Location' : 'Destination');
            this.mapService.map.setCenter(location);
  
            // Fetch suggested routes if both currentLocation and destination are set
            if (this.currentLocation && this.destination) {
              this.fetchSuggestedRoutes();
            }
          } else {
            // Clear the input if the place is outside the bounds
            input.value = '';
            toastr.info('Please select a location within Clark only.');
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