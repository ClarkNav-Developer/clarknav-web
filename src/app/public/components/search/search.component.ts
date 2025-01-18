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
  // Locations and addresses
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;
  currentLocationAddress = 'Loading...';
  destinationAddress = 'Loading...';
  geocoder = new google.maps.Geocoder();

  // UI state
  showNavigationWindow = false;
  isBottomSheetVisible = false;
  showAllRoutes = true;

  // Route data
  suggestedRoutes: any[] = [];
  selectedRoute: any;
  highlightedRoute: any = null;

  // Dragging state for the bottom sheet
  private isDragging = false;
  private startY = 0;
  private startHeight = 0;

  constructor(
    private mapService: MapService,
    private navigationService: NavigationService,
    private suggestedRoutesService: SuggestedRoutesService,
    private renderer: Renderer2
  ) { }

  /*------------------------------------------
  Lifecycle Hooks
  --------------------------------------------*/
  ngOnInit(): void {
    this.initializeAutocomplete();
    this.setupBottomSheetDragging();
  }

  ngAfterViewInit(): void {
    if (!this.mapService) {
      console.error('MapService is not available.');
    }
  }

  /*------------------------------------------
  UI Controls
  --------------------------------------------*/
  toggleMobileContainer(): void {
    const mobileContainer = document.querySelector('.mobile-container');
    mobileContainer?.classList.toggle('show');
  }

  hideBottomSheet(): void {
    this.isBottomSheetVisible = false;
  }

  /*------------------------------------------
  Dragging Logic for Bottom Sheet
  --------------------------------------------*/
  private setupBottomSheetDragging(): void {
    const bottomSheet = document.getElementById('bottomSheet');
    const handle = bottomSheet?.querySelector('.drag-handle');

    if (handle && bottomSheet) {
      this.renderer.listen(handle, 'mousedown', (event: MouseEvent) => this.onDragStart(event, bottomSheet));
      this.renderer.listen(document, 'mousemove', (event: MouseEvent) => this.onDrag(event, bottomSheet));
      this.renderer.listen(document, 'mouseup', () => this.onDragEnd());

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
      const newHeight = Math.max(150, Math.min(this.startHeight + deltaY, window.innerHeight));
      this.updateBottomSheetHeight(bottomSheet, newHeight);
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
      const newHeight = Math.max(150, Math.min(this.startHeight + deltaY, window.innerHeight));
      this.updateBottomSheetHeight(bottomSheet, newHeight);
    }
  }

  private onDragEnd(): void {
    this.isDragging = false;
  }

  private getClientY(event: MouseEvent | TouchEvent): number {
    return event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
  }

  private updateBottomSheetHeight(bottomSheet: HTMLElement, height: number): void {
    bottomSheet.style.height = `${height}px`;

    const routesContainer = bottomSheet.querySelector('.routes-container-mobile') as HTMLElement;
    if (routesContainer) {
      routesContainer.style.maxHeight = `${height - 100}px`;
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

    this.resolveAddresses();
    this.fetchSuggestedRoutes();
    this.navigationService.currentLocation = this.currentLocation;
    this.navigationService.destination = this.destination;
    this.navigationService.navigateToDestination();

    this.isBottomSheetVisible = true;
  }

  fetchSuggestedRoutes() {
    if (this.currentLocation && this.destination) {
      const key = JSON.stringify({ currentLocation: this.currentLocation, destination: this.destination });
      const cachedRoutes = localStorage.getItem(key);
      if (cachedRoutes) {
        this.suggestedRoutes = JSON.parse(cachedRoutes);
        console.log('Suggested routes loaded from cache');
        return;
      }

      this.suggestedRoutes = this.suggestedRoutesService.getSuggestedRoutes(this.currentLocation, this.destination);
      localStorage.setItem(key, JSON.stringify(this.suggestedRoutes));
    }
  }

  highlightRoute(route: any): void {
    this.highlightedRoute = route;
    this.renderRoutesOnMap(route);
  }

  clearHighlight(): void {
    this.highlightedRoute = null;
    this.renderRoutesOnMap();
  }

  private renderRoutesOnMap(route?: any): void {
    this.mapService.clearMap();

    if (route) {
      // Render only the provided route
      this.mapService.displayRouteSegments({ path: route.path, color: route.color });
    } else if (this.showAllRoutes) {
      // Render all suggested routes
      this.suggestedRoutes.forEach(route => {
        this.mapService.displayRouteSegments({ path: route.path, color: route.color });
      });
    }
  }

  selectRoute(route: any): void {
    this.selectedRoute = route;
    this.showAllRoutes = false;

    // Render only the selected route
    this.renderRoutesOnMap(route);
  }


  /*------------------------------------------
  Location Utilities
  --------------------------------------------*/
  reverseLocation(): void {
    if (this.currentLocation && this.destination) {
      [this.currentLocation, this.destination] = [this.destination, this.currentLocation];
      this.resolveAddresses();
      this.mapService.map.setCenter(this.currentLocation);
    } else {
      alert('Both current location and destination must be set to reverse.');
    }
  }

  useMyLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        this.currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.resolveAddresses();
        this.mapService.addMarker(this.currentLocation, 'Your Location');
        this.mapService.map.setCenter(this.currentLocation);
      }, error => {
        console.error('Error fetching location', error);
        alert('Unable to fetch your current location.');
      });
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  private resolveAddresses(): void {
    if (this.currentLocation) {
      this.geocodeLatLng(this.currentLocation, (address: string) => {
        this.currentLocationAddress = address || 'Unable to resolve address';
      });
    } else {
      this.currentLocationAddress = 'Current location not set';
    }

    if (this.destination) {
      this.geocodeLatLng(this.destination, (address: string) => {
        this.destinationAddress = address || 'Unable to resolve address';
      });
    } else {
      this.destinationAddress = 'Destination not set';
    }
  }


  private geocodeLatLng(latLng: google.maps.LatLngLiteral, callback: (address: string) => void): void {
    this.geocoder.geocode({ location: latLng }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
      if (status === 'OK' && results[0]) {
        let placeName = '';

        // Try to find a specific name for the origin (e.g., "Bayanihan Jeepney Terminal")
        for (const component of results[0].address_components) {
          if (component.types.includes('point_of_interest') || component.types.includes('establishment')) {
            placeName = component.long_name;
            break;
          }
        }

        // Fallback to locality or sublocality if no specific name is found
        if (!placeName) {
          for (const component of results[0].address_components) {
            if (component.types.includes('locality') || component.types.includes('sublocality')) {
              placeName = component.long_name;
              break;
            }
          }
        }

        // Default to formatted address if no specific place is found
        if (!placeName) {
          placeName = results[0].formatted_address;
        }

        callback(placeName);  // Return the resolved name
      } else {
        console.error('Geocoder failed due to: ' + status);
        callback('Address not found');
      }
    });
  }


  /*------------------------------------------
  Fare and Distance Calculations
  --------------------------------------------*/
  private calculateFare(route: any): void {
    const baseFare = 13;
    const additionalFare = Math.max(0, route.distanceInKm - 4) * 1.8;
    route.fare = Math.round((baseFare + additionalFare) * 4) / 4;
  }

  private calculateDistance(start: google.maps.LatLngLiteral, end: google.maps.LatLngLiteral): number {
    const startLatLng = new google.maps.LatLng(start.lat, start.lng);
    const endLatLng = new google.maps.LatLng(end.lat, end.lng);
    return google.maps.geometry.spherical.computeDistanceBetween(startLatLng, endLatLng) / 1000;
  }

  private calculateDuration(route: any): void {
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [this.currentLocation],
        destinations: [this.destination],
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response: google.maps.DistanceMatrixResponse, status: google.maps.DistanceMatrixStatus) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          route.duration = response.rows[0].elements[0].duration.text;
        } else {
          console.error('Error fetching duration: ', status);
        }
      }
    );
  }

  /*------------------------------------------
  Autocomplete Initialization
  --------------------------------------------*/
  private initializeAutocomplete(): void {
    const inputs = [
      'search-box',
      'search-box-2',
      'search-box-mobile',
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

            if (input.id.includes('current')) {
              this.currentLocation = location;
            } else {
              this.destination = location;
            }

            this.resolveAddresses(); // Ensure address is resolved after location selection
            this.mapService.addMarker(location, input.id.includes('current') ? 'Your Location' : 'Destination');
            this.mapService.map.setCenter(location);
            this.fetchSuggestedRoutes();
          }
        });
      }
    });
  }
}
