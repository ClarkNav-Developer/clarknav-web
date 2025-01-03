import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FloatingWindowService } from './floating-window.service';

declare var google: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isVisible: boolean = false;

  toggleVisibility() {
    this.isVisible = !this.isVisible;
  }

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

  // Declare but do not initialize the observable
  isFloatingVisible: any;

  constructor(private floatingWindowService: FloatingWindowService, private http: HttpClient) {}

  ngOnInit(): void {
    // Properly assign the observable in ngOnInit
    this.isFloatingVisible = this.floatingWindowService.isVisible$;

    this.loadMapStyle().subscribe(style => {
      this.initMap(style);  // Pass the style to the initMap function
    });
    this.initAutocomplete();
    this.initCurrentLocationAutocomplete();
  }

  /*------------------------------------------
  Floating Window Logic
  --------------------------------------------*/
  openAccountComponent() {
    this.floatingWindowService.open();
  }

  closeAccountComponent() {
    this.floatingWindowService.close();
  }

  /*------------------------------------------
  Load Retro Map Style
  --------------------------------------------*/
  loadMapStyle() {
    return this.http.get<any>('assets/retro.json');
  }

  /*------------------------------------------
  Initialize Map
  --------------------------------------------*/
  initMap(style: any) {
    const mapElement = document.getElementById('map');
    if (mapElement) {
      this.map = new google.maps.Map(mapElement as HTMLElement, {
        center: { lat: 15.187769063648858, lng: 120.55950164794922 },
        zoom: 14,
        mapTypeControl: false,  // Removes map type (satellite, terrain, etc.)
        streetViewControl: false,  // Optional: Disables Street View control
        fullscreenControl: false,  // Optional: Disables fullscreen control
        styles: style  // Apply the loaded style here
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
    const desktopInput = document.getElementById('search-box') as HTMLInputElement;
    const mobileInput = document.getElementById('search-box-mobile') as HTMLInputElement;
  
    [desktopInput, mobileInput].forEach((input) => {
      if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
          componentRestrictions: { country: 'PH' },
          bounds: this.clarkBounds, // Restrict to Clark bounds
          strictBounds: true,
        });
  
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            this.destination = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
  
            this.addMarker(this.destination, 'Destination');
            this.map.setCenter(this.destination);
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
          bounds: this.clarkBounds, // Restrict to Clark bounds
          strictBounds: true,
        });
  
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            this.currentLocation = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
  
            this.addMarker(this.currentLocation, 'Your Location');
            this.map.setCenter(this.currentLocation);
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
      this.map.setCenter(this.currentLocation);
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
          this.addMarker(this.currentLocation, 'Your Location');
          this.map.setCenter(this.currentLocation);
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
