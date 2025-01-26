import { Component, OnInit, AfterViewInit, Renderer2, OnDestroy } from '@angular/core';
import { MapService } from '../../services/map/map.service';
import { NavigationService } from '../../services/navigation/navigation.service';
import { SuggestedRoutesService } from '../../services/routes/suggested-routes.service';
import { GeocodingService } from '../../services/geocoding/geocoding.service';
import { BottomSheetService } from '../../services/bottom-sheet/bottom-sheet.service';
import { FareService } from '../../services/fare/fare.service';
import { LocationService } from '../../services/geocoding/location.service';

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

  // Route data
  suggestedRoutes: any[] = [];
  selectedRoute: any;
  highlightedRoute: any = null;
  route: any = { duration: null };

  private trackingInterval: any = null;
  // Add a flag to check if a search has been performed
  searchPerformed = false;

  constructor(
    private mapService: MapService,
    private navigationService: NavigationService,
    private suggestedRoutesService: SuggestedRoutesService,
    private geocodingService: GeocodingService,
    private bottomSheetService: BottomSheetService,
    private fareService: FareService,
    public locationService: LocationService,
    private renderer: Renderer2
  ) { }

  /*------------------------------------------
  Lifecycle Hooks
  --------------------------------------------*/
  ngOnInit(): void {
    this.initializeAutocomplete();
    this.setupBottomSheetDragging();
    this.bottomSheetService.setRenderer(this.renderer);
    this.locationService.resolveAddresses(); // Ensure addresses are resolved on initialization
  }

  ngAfterViewInit(): void {
    if (!this.mapService) {
      console.error('MapService is not available.');
    }
  }

  ngOnDestroy(): void {
    this.navigationService.stopRealTimeTracking();
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
        console.log('Suggested routes loaded from cache');
      } else {
        this.suggestedRoutes = this.suggestedRoutesService.getSuggestedRoutes(this.currentLocation, this.destination);
        localStorage.setItem(key, JSON.stringify(this.suggestedRoutes));
      }

      // Calculate distance, duration, and fare for each route
      this.suggestedRoutes.forEach(route => {
        route.distanceInKm = this.fareService.calculateDistance(route);
        console.log(`Distance for route: ${route.distanceInKm} km`);
        this.fareService.calculateDuration(this.currentLocation!, this.destination!, (duration) => {
          route.duration = duration;
        });
        this.fareService.calculateFare(route);
        console.log(`Fare for route: ₱${route.fare}`);
        console.log(`Student Fare for route: ₱${route.studentFare}`);
      });
    }
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
    } else {
      alert('Please select a route to start navigation.');
    }
  }

  stopNavigation(): void {
    this.navigationService.stopRealTimeTracking();
    this.mapService.clearMap(); // Clear all markers and routes rendered on the map
    this.showNavigationStatus = false; // Hide navigation status
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

            this.locationService.resolveAddresses(); // Ensure address is resolved after location selection
            this.mapService.addMarker(location, input.id.includes('current') ? 'Your Location' : 'Destination');
            this.mapService.map.setCenter(location);

            // Fetch suggested routes immediately after setting the locations
            this.fetchSuggestedRoutes();

            // Update the searchPerformed flag
            this.searchPerformed = !!this.currentLocation && !!this.destination;
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