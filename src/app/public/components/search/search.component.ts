import { Component, OnInit, AfterViewInit } from '@angular/core';
import { MapService } from '../../services/map.service';
import { NavigationService } from '../../services/navigation.service';

declare var google: any;

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit, AfterViewInit {
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;

  constructor(private mapService: MapService, private navigationService: NavigationService) {}

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

  navigateToDestination() {
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
            this.destination = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            this.mapService.addMarker(this.destination, 'Destination');
            this.mapService.map.setCenter(this.destination);
            this.navigationService.findRoutes();
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

      // Update the input fields
      const currentLocationInput = document.getElementById('current-location-box') as HTMLInputElement;
      const destinationInput = document.getElementById('search-box') as HTMLInputElement;
      const currentLocationInputMobile = document.getElementById('current-location-box-mobile') as HTMLInputElement;
      const destinationInputMobile = document.getElementById('search-box-mobile') as HTMLInputElement;

      if (currentLocationInput) {
        currentLocationInput.value = `Lat: ${this.currentLocation.lat}, Lng: ${this.currentLocation.lng}`;
      }

      if (destinationInput) {
        destinationInput.value = `Lat: ${this.destination.lat}, Lng: ${this.destination.lng}`;
      }

      if (currentLocationInputMobile) {
        currentLocationInputMobile.value = `Lat: ${this.currentLocation.lat}, Lng: ${this.currentLocation.lng}`;
      }

      if (destinationInputMobile) {
        destinationInputMobile.value = `Lat: ${this.destination.lat}, Lng: ${this.destination.lng}`;
      }

      // Re-center the map
      this.mapService.map.setCenter(this.currentLocation);
    } else {
      alert('Both current location and destination must be set to reverse.');
    }
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
          const desktopInput = document.getElementById('current-location-box') as HTMLInputElement;
          const mobileInput = document.getElementById('current-location-box-mobile') as HTMLInputElement;

          if (desktopInput) {
            desktopInput.value = `Lat: ${this.currentLocation.lat}, Lng: ${this.currentLocation.lng}`;
          }

          if (mobileInput) {
            mobileInput.value = `Lat: ${this.currentLocation.lat}, Lng: ${this.currentLocation.lng}`;
          }

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