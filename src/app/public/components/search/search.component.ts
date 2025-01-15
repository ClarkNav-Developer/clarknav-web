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
  geocoder: any;
  showNavigationWindow = false; // Controls the navigation window
  suggestedRoutes: any[] = []; // Store suggested routes
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

  navigateToDestination() {
    console.log('Navigate button clicked'); // Debugging statement
    this.navigationService.currentLocation = this.currentLocation;
    this.navigationService.destination = this.destination;
    this.isBottomSheetVisible = true; // Show the bottom sheet

    if (this.destination) {
      // Fetch and display suggested routes
      this.suggestedRoutesService.getRoutesForDestination(this.destination).subscribe((routes: any[]) => {
        console.log('Fetched routes:', routes); // Debugging statement
        this.suggestedRoutes = routes;
      });
    }
  }

  selectRoute(route: any) {
    this.navigationService.navigateToDestinationWithRoute(route);
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
        }
      });
    }
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