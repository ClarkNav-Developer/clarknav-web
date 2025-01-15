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
  selectedRoute: any; // Store the selected route
  showAllRoutes: boolean = true;

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
  }

  ngAfterViewInit(): void {
    // Ensure mapService is available after view initialization
    if (!this.mapService) {
      console.error('MapService is not available');
    }
  }

  // File: search.component.ts
  navigateToDestination() {
    if (!this.currentLocation || !this.destination) {
      alert('Please set both your current location and destination.');
      return;
    }

    // Fetch and display suggested routes
    const routes = this.suggestedRoutesService.getSuggestedRoutes(this.currentLocation, this.destination);
    if (routes.length > 0) {
      this.suggestedRoutes = routes;
      this.showAllRoutes = true;
      console.log('Suggested Routes:', this.suggestedRoutes);
    } else {
      alert('No suggested routes found.');
    }

    // Navigate logic
    this.navigationService.currentLocation = this.currentLocation;
    this.navigationService.destination = this.destination;
    this.navigationService.navigateToDestination();
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

  fetchSuggestedRoutes() {
    if (this.currentLocation && this.destination) {
      const routes = this.suggestedRoutesService.getSuggestedRoutes(this.currentLocation, this.destination);
      console.log('Raw Suggested Routes:', routes);
  
      if (routes.length > 0) {
        // Flatten the array if it contains nested arrays
        this.suggestedRoutes = routes.flat();
        console.log('Flattened Suggested Routes:', this.suggestedRoutes);
      } else {
        console.error('No suggested routes found.');
      }
    } else {
      console.error('Current location or destination not set.');
    }
  }
  
  // Highlight the selected route on the map
  selectRoute(route: any): void {
    this.selectedRoute = route;
    this.showAllRoutes = false; // Hide unselected routes
    this.mapService.clearMap();
    this.mapService.displayRoutePath({ path: route.path, color: route.color });
    console.log('Selected Route:', route);
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