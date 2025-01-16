import { Component, OnInit, AfterViewInit, Renderer2 } from '@angular/core';
import { MapService } from '../../services/map.service';
import { NavigationService } from '../../services/navigation.service';
import { SuggestedRoutesService } from '../../services/suggested-routes.service';

declare var google: any;

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit, AfterViewInit {
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;
  currentLocationAddress: string = 'Loading...';
  destinationAddress: string = 'Loading...';
  geocoder: any;
  showNavigationWindow = false; // Controls the navigation window
  suggestedRoutes: any[] = []; // Store suggested routes
  selectedRoute: any; // Store the selected route
  highlightedRoute: any = null;
  showAllRoutes: boolean = true;
  private isDragging = false;
  private startY = 0;
  private startBottom = 0;
  private startHeight = 0;
  isBottomSheetVisible = false; // Controls the visibility of the bottom sheet

  constructor(
    private mapService: MapService,
    private navigationService: NavigationService,
    private suggestedRoutesService: SuggestedRoutesService,
    private renderer: Renderer2
  ) {
    this.geocoder = new google.maps.Geocoder();
  }

  toggleMobileContainer() {
    const mobileContainer = document.querySelector('.mobile-container');
    if (mobileContainer) {
      mobileContainer.classList.toggle('show'); // Add or remove the 'show' class
    }
  }

  ngOnInit(): void {
    this.initAutocomplete();
    this.initCurrentLocationAutocomplete();
    this.initSearchLocationAutocomplete();

    const bottomSheet = document.getElementById('bottomSheet');
    const handle = bottomSheet?.querySelector('.drag-handle');

    if (handle && bottomSheet) {
      // Mouse events
      this.renderer.listen(handle, 'mousedown', (event: MouseEvent) => this.onDragStart(event, bottomSheet));
      this.renderer.listen(document, 'mousemove', (event: MouseEvent) => this.onDrag(event, bottomSheet));
      this.renderer.listen(document, 'mouseup', () => this.onDragEnd());

      // Touch events
      this.renderer.listen(handle, 'touchstart', (event: TouchEvent) => this.onTouchStart(event, bottomSheet));
      this.renderer.listen(document, 'touchmove', (event: TouchEvent) => this.onTouchMove(event, bottomSheet));
      this.renderer.listen(document, 'touchend', () => this.onDragEnd());
    }
  }

  private onDragStart(event: MouseEvent | TouchEvent, bottomSheet: HTMLElement): void {
    this.isDragging = true;
    this.startY = this.getClientY(event);
    this.startHeight = bottomSheet.offsetHeight;
  }

  private onDrag(event: MouseEvent, bottomSheet: HTMLElement | null): void {
    if (this.isDragging && bottomSheet) {
      const deltaY = this.startY - event.clientY;
      const newHeight = Math.min(window.innerHeight, Math.max(100, this.startBottom + deltaY));

      // Set the height of the bottom sheet itself
      bottomSheet.style.height = `${newHeight}px`;

      // Make sure the content inside the bottom sheet is scrollable if needed
      const routesContainer = bottomSheet.querySelector('.routes-container-mobile') as HTMLElement;
      if (routesContainer) {
        const availableHeight = newHeight - 100; // Adjust for padding, headers, etc.
        routesContainer.style.maxHeight = `${availableHeight}px`; // Allow routes container to be scrollable within the available height
      }
    }
  }

  private onTouchStart(event: TouchEvent, bottomSheet: HTMLElement): void {
    this.isDragging = true;
    this.startY = this.getClientY(event);
    this.startHeight = bottomSheet.offsetHeight;
  }

  private onTouchMove(event: TouchEvent, bottomSheet: HTMLElement): void {
    if (this.isDragging) {
      const deltaY = this.startY - event.touches[0].clientY;
      const newHeight = Math.max(150, Math.min(this.startHeight + deltaY, window.innerHeight - 100)); // Limit height
      bottomSheet.style.height = `${newHeight}px`;
    }
  }

  private onDragEnd(): void {
    this.isDragging = false;
  }

  private getClientY(event: MouseEvent | TouchEvent): number {
    return event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
  }


  ngAfterViewInit(): void {
    // Ensure mapService is available after view initialization
    if (!this.mapService) {
      console.error('MapService is not available');
    }
  }

  // File: search.component.ts
  navigateToDestination(): void {
    if (!this.currentLocation || !this.destination) {
      alert('Please set both your current location and destination.');
      return;
    }

    // Fetch addresses for currentLocation and destination
    this.geocodeLatLng(this.currentLocation, (address) => {
      this.currentLocationAddress = address;
    });

    this.geocodeLatLng(this.destination, (address) => {
      this.destinationAddress = address;
    });

    // Fetch suggested routes
    const routes = this.suggestedRoutesService.getSuggestedRoutes(this.currentLocation, this.destination);
    if (routes.length > 0) {
      this.suggestedRoutes = routes.map(route => ({
        ...route,
        start: this.currentLocation,
        end: this.destination,
      }));
      this.showAllRoutes = true;

      // Render all routes on the map
      this.suggestedRoutes.forEach(route => {
        this.mapService.displayRouteSegments({ path: route.path, color: route.color });
      });
      console.log('Suggested Routes with updated start and end:', this.suggestedRoutes);
    } else {
      alert('No suggested routes found.');
    }

    // Navigate logic
    this.navigationService.currentLocation = this.currentLocation;
    this.navigationService.destination = this.destination;
    this.isBottomSheetVisible = true;
    this.navigationService.navigateToDestination();
    // Fetch suggested routes
    console.log('Debug: Fetching suggested routes...');
    this.fetchSuggestedRoutes();
  }


  hideBottomSheet(): void {
    this.isBottomSheetVisible = false; // Hide the bottom sheet
  }

  /*------------------------------------------
  Initialize Autocomplete for Searching Locations
  --------------------------------------------*/
  initSearchLocationAutocomplete() {
    const searchInput = document.getElementById('search-location-box-mobile') as HTMLInputElement;

    if (searchInput) {
      const autocomplete = new google.maps.places.Autocomplete(searchInput, {
        componentRestrictions: { country: 'PH' },
        bounds: this.navigationService.clarkBounds, // Restrict to Clark bounds
        strictBounds: true,
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          this.destination = location;
          this.mapService.addMarker(location, 'Searched Location');
          this.mapService.map.setCenter(location);

          // Fetch suggested routes
          this.fetchSuggestedRoutes();
        }
      });
    }
  }

  fetchSuggestedRoutes(): void {
    if (this.currentLocation && this.destination) {
      const routes = this.suggestedRoutesService.getSuggestedRoutes(this.currentLocation, this.destination);
      if (routes.length > 0) {
        this.suggestedRoutes = routes.map(route => ({
          ...route,
          start: this.currentLocation,
          end: this.destination,
          fare: this.calculateFare(route),
          duration: null, // Initialize with null
        }));
  
        this.suggestedRoutes.forEach(route => {
          this.calculateDuration(route);
        });
      } else {
        console.error('No suggested routes found.');
      }
    } else {
      console.error('Current location or destination not set.');
    }
  }
  
  calculateFare(route: any): number {
    // Placeholder logic for fare calculation
    return 14; // Example static fare
  }

  calculateDuration(route: any): void {
    if (!this.currentLocation || !this.destination) {
      console.error('Debug: Missing current location or destination for duration calculation.');
      route.duration = 'Error calculating time'; // Fallback for UI
      return;
    }
  
    console.log('Debug: Starting duration calculation for route:', route);
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [this.currentLocation],
        destinations: [this.destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response: google.maps.DistanceMatrixResponse, status: google.maps.DistanceMatrixStatus) => {
        console.log('Debug: Distance Matrix API status:', status);
        if (status === google.maps.DistanceMatrixStatus.OK) {
          console.log('Debug: API Response:', response);
          const result = response.rows[0].elements[0];
          if (result.status === 'OK') {
            route.duration = result.duration.text;
            console.log('Debug: Duration successfully calculated:', result.duration.text);
          } else {
            console.warn('Debug: Duration calculation failed:', result.status);
            route.duration = 'Unable to calculate time';
          }
        } else {
          console.error('Debug: API Error:', status);
          route.duration = 'Error connecting to API';
        }
      }
    );
  }

  calculateTime(route: any): string {
    // Placeholder logic for time calculation
    return '10:00 AM - 10:30 AM'; // Example static time
  }

  highlightRoute(route: any): void {
    this.highlightedRoute = route;
    this.mapService.clearMap();
    this.mapService.displayRouteSegments({ path: route.path, color: route.color });
  }

  clearHighlight(): void {
    this.highlightedRoute = null;
    if (this.showAllRoutes) {
      this.suggestedRoutes.forEach(route => {
        this.mapService.displayRouteSegments({ path: route.path, color: route.color });
      });
    }
  }

  selectRoute(route: any): void {
    this.selectedRoute = route;
    this.showAllRoutes = false;

    // Clear map and render only the selected route
    this.mapService.clearMap();
    this.mapService.displayRouteSegments({ path: route.path, color: route.color });
  }


  /*------------------------------------------
  Initialize Autocomplete for Destination
  --------------------------------------------*/
  initAutocomplete() {
    const desktopInput = document.getElementById('search-box') as HTMLInputElement;
    const mobileInput = document.getElementById('search-box-mobile') as HTMLInputElement;
    const desktopInputSearch = document.getElementById('search-box-2') as HTMLInputElement;
    const mobileInputSearch = document.getElementById('search-box-mobile-2') as HTMLInputElement;

    [desktopInput, mobileInput, desktopInputSearch, mobileInputSearch].forEach((input) => {
      if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
          componentRestrictions: { country: 'PH' },
          bounds: this.navigationService.clarkBounds, // Restrict to Clark bounds
          strictBounds: true,
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            this.destination = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            this.mapService.addMarker(this.destination, 'Destination');
            this.mapService.map.setCenter(this.destination);
            // this.navigationService.findRoutes();
          }
        });
      }
    });
  }

  /*------------------------------------------
  Initialize Autocomplete for Current Location
  --------------------------------------------*/
  initCurrentLocationAutocomplete() {
    const desktopInput = document.getElementById('current-location-box') as HTMLInputElement;
    const mobileInput = document.getElementById('current-location-box-mobile') as HTMLInputElement;

    [desktopInput, mobileInput].forEach((input) => {
      if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
          componentRestrictions: { country: 'PH' },
          bounds: this.navigationService.clarkBounds, // Restrict to Clark bounds
          strictBounds: true,
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            this.currentLocation = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            this.mapService.addMarker(this.currentLocation, 'Your Location');
            this.mapService.map.setCenter(this.currentLocation);
          }
        });
      }
    });
  }

  /*------------------------------------------
  Reversing the Current Location and Destination
  --------------------------------------------*/
  reverseLocation() {
    if (this.currentLocation && this.destination) {
      // Swap the locations
      const temp = this.currentLocation;
      this.currentLocation = this.destination;
      this.destination = temp;

      // Update the input fields with addresses
      this.geocodeLatLng(this.currentLocation, (address: string) => {
        const currentLocationInput = document.getElementById('current-location-box') as HTMLInputElement;
        const currentLocationInputMobile = document.getElementById('current-location-box-mobile') as HTMLInputElement;

        if (currentLocationInput) {
          currentLocationInput.value = address;
        }

        if (currentLocationInputMobile) {
          currentLocationInputMobile.value = address;
        }
      });

      this.geocodeLatLng(this.destination, (address: string) => {
        const destinationInput = document.getElementById('search-box') as HTMLInputElement;
        const destinationInputMobile = document.getElementById('search-box-mobile') as HTMLInputElement;

        if (destinationInput) {
          destinationInput.value = address;
        }

        if (destinationInputMobile) {
          destinationInputMobile.value = address;
        }
      });

      // Re-center the map
      this.mapService.map.setCenter(this.currentLocation);
    } else {
      alert('Both current location and destination must be set to reverse.');
    }
  }

  /*------------------------------------------
  Geocode LatLng to Address
  --------------------------------------------*/
  geocodeLatLng(latlng: google.maps.LatLngLiteral, callback: (address: string) => void) {
    this.geocoder.geocode({ location: latlng }, (results: any, status: any) => {
      if (status === 'OK') {
        if (results[0]) {
          callback(results[0].formatted_address);
        } else {
          console.error('No results found');
          callback('Unknown location');
        }
      } else {
        console.error('Geocoder failed due to: ' + status);
        callback('Unknown location');
      }
    });
  }

  /*------------------------------------------
  Use Device's Geolocation for Current Location
  --------------------------------------------*/
  useMyLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Update input fields for both desktop and mobile views
          this.geocodeLatLng(this.currentLocation, (address: string) => {
            const desktopInput = document.getElementById('current-location-box') as HTMLInputElement;
            const mobileInput = document.getElementById('current-location-box-mobile') as HTMLInputElement;

            if (desktopInput) {
              desktopInput.value = address;
            }

            if (mobileInput) {
              mobileInput.value = address;
            }
          });

          // Add a marker and center the map on the current location
          this.mapService.addMarker(this.currentLocation, 'Your Location');
          this.mapService.map.setCenter(this.currentLocation);
        },
        (error) => {
          console.error('Error getting current location', error);
          alert('Unable to fetch your current location. Please try again.');
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      alert('Geolocation is not supported by your browser.');
    }
  }
}