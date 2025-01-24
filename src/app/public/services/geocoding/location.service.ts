import { Injectable } from '@angular/core';
import { GeocodingService } from './geocoding.service';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;
  currentLocationAddress = 'Loading...';
  destinationAddress = 'Loading...';

  constructor(private geocodingService: GeocodingService) { }

  reverseLocation(): void {
    if (this.currentLocation && this.destination) {
      // Reverse the currentLocation and destination
      [this.currentLocation, this.destination] = [this.destination, this.currentLocation];

      // Reverse the input values in the search boxes
      const currentLocationInput = document.getElementById('current-location-box') as HTMLInputElement;
      const destinationInput = document.getElementById('search-box') as HTMLInputElement;

      if (currentLocationInput && destinationInput) {
        const tempValue = currentLocationInput.value;
        currentLocationInput.value = destinationInput.value;
        destinationInput.value = tempValue;
      }

      // Resolve addresses and update the map
      this.resolveAddresses();
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
        console.log('Current Location:', this.currentLocation);

        // Update the input fields with the current location address
        const currentLocationInput = document.getElementById('current-location-box') as HTMLInputElement;
        const currentLocationInputMobile = document.getElementById('current-location-box-mobile') as HTMLInputElement;

        if (currentLocationInput || currentLocationInputMobile) {
          this.geocodingService.geocodeLatLng(this.currentLocation, (address: string) => {
            if (currentLocationInput) {
              currentLocationInput.value = address;
            }
            if (currentLocationInputMobile) {
              currentLocationInputMobile.value = address;
            }
            this.currentLocationAddress = address;
          });
        }

        this.resolveAddresses();
      }, error => {
        console.error('Error fetching location', error);
        alert('Unable to fetch your current location.');
      });
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  resolveAddresses(): void {
    if (this.currentLocation) {
      this.geocodingService.geocodeLatLng(this.currentLocation, (address: string) => {
        this.currentLocationAddress = address || 'Unable to resolve address';
      });
    } else {
      this.currentLocationAddress = 'Current location not set';
    }

    if (this.destination) {
      this.geocodingService.geocodeLatLng(this.destination, (address: string) => {
        this.destinationAddress = address || 'Unable to resolve address';
      });
    } else {
      this.destinationAddress = 'Destination not set';
    }
  }
}