import { Component, OnInit } from '@angular/core';

declare var google: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  map: any;
  directionsService: any;
  directionsRenderer: any;
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;

  // Coordinates for Clark's bounds
  private clarkBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(15.167864949136394, 120.48439979553223),  // Southwest coordinates of Clark
    new google.maps.LatLng(15.22415233433501, 120.58105440940092)   // Northeast coordinates of Clark
  );

  constructor() {}

  ngOnInit(): void {
    this.initMap();
    this.initAutocomplete();
    this.initCurrentLocationAutocomplete();
  }

  /*------------------------------------------
  Initialize Map
  --------------------------------------------*/
  initMap() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
      this.map = new google.maps.Map(mapElement as HTMLElement, {
        center: { lat: 15.187769063648858, lng: 120.55950164794922 },
        zoom: 14,
        mapTypeControl: false,  // Removes map type (satellite, terrain, etc.)
        streetViewControl: false,  // Optional: Disables Street View control
        fullscreenControl: false,  // Optional: Disables fullscreen control
      });

      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer();
      this.directionsRenderer.setMap(this.map);
    } else {
      console.error('Map element not found!');
    }
  }

  /*------------------------------------------
  Initialize Autocomplete for Destination
  --------------------------------------------*/
  initAutocomplete() {
    const input = document.getElementById('search-box') as HTMLInputElement;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'PH' },
      bounds: this.clarkBounds,  // Restrict to Clark bounds
      strictBounds: true
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        this.destination = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };

        // Add marker for destination
        this.addMarker(this.destination, 'Destination');
        this.map.setCenter(this.destination);
      }
    });
  }

  /*------------------------------------------
  Initialize Autocomplete for Current Location
  --------------------------------------------*/
  initCurrentLocationAutocomplete() {
    const input = document.getElementById('current-location-box') as HTMLInputElement;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'PH' },
      bounds: this.clarkBounds,  // Restrict to Clark bounds
      strictBounds: true
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        this.currentLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };

        // Add marker for current location
        this.addMarker(this.currentLocation, 'Your Location');
        this.map.setCenter(this.currentLocation);
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

          const input = document.getElementById('current-location-box') as HTMLInputElement;
          input.value = `Lat: ${this.currentLocation.lat}, Lng: ${this.currentLocation.lng}`;

          this.addMarker(this.currentLocation, 'Your Location');
          this.map.setCenter(this.currentLocation);
        },
        (error) => {
          console.error('Error getting current location', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  /*------------------------------------------
  Add Marker to Map
  --------------------------------------------*/
  addMarker(location: google.maps.LatLngLiteral, title: string) {
    new google.maps.Marker({
      position: location,
      map: this.map,
      title: title
    });
  }

  /*------------------------------------------
  Navigate to Destination
  --------------------------------------------*/
  navigateToDestination() {
    if (this.currentLocation && this.destination) {
      const request = {
        origin: this.currentLocation,
        destination: this.destination,
        travelMode: google.maps.TravelMode.DRIVING
      };

      this.directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          this.directionsRenderer.setDirections(result);
        } else {
          console.error('Directions request failed due to ' + status);
        }
      });
    } else {
      alert('Please set both current location and destination.');
    }
  }
}
