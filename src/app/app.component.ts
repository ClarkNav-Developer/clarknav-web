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
  map: any;
  directionsService: any;
  directionsRenderer: any;
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;
  jeepneyRoutes: any[] = [];
  busRoutes: any[] = [];
  filteredRoutes: any[] = [];

  // Coordinates for Clark's bounds
  private clarkBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(15.167864949136394, 120.48439979553223),  // Southwest coordinates of Clark
    new google.maps.LatLng(15.22415233433501, 120.58105440940092)   // Northeast coordinates of Clark
  );

  // Declare but do not initialize the observable
  isFloatingVisible: any;

  constructor(public floatingWindowService: FloatingWindowService, private http: HttpClient) {}

  ngOnInit(): void {
    // Properly assign the observable in ngOnInit
    this.isFloatingVisible = this.floatingWindowService.visibleComponent$;

    this.loadMapStyle().subscribe(style => {
      this.initMap(style);  // Pass the style to the initMap function
    });
    this.initAutocomplete();
    this.initCurrentLocationAutocomplete();
    this.initSearchLocationAutocomplete();
    this.loadRoutes();
  }

  /*------------------------------------------
  Load Routes from JSON
  --------------------------------------------*/

  loadRoutes() {
    this.http.get('assets/routes.json').subscribe((data: any) => {
      this.jeepneyRoutes = data.jeepneyRoutes;
      this.busRoutes = data.busRoutes;
    });
  }

  /*------------------------------------------
  Floating Window Logic
  --------------------------------------------*/
  openAccountComponent() {
    this.floatingWindowService.open('account');
  }
  
  openPlannerComponent() {
    this.floatingWindowService.open('planner');
  }

  openRouteComponent() {
    this.floatingWindowService.open('route');
  }
  
  closeFloatingWindow() {
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
        zoomControl: false, //Optional: Disables zom control
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
  Initialize Autocomplete for Searching Locations
  --------------------------------------------*/
  initSearchLocationAutocomplete() {
    const searchInput = document.getElementById('search-location-box-mobile') as HTMLInputElement;

    if (searchInput) {
      const autocomplete = new google.maps.places.Autocomplete(searchInput, {
        componentRestrictions: { country: 'PH' },
        bounds: this.clarkBounds, // Restrict to Clark bounds
        strictBounds: true,
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          this.addMarker(location, 'Searched Location');
          this.map.setCenter(location);
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
            this.findRoutes();
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

  // addMarker(location: google.maps.LatLngLiteral, title: string) {
  //   const marker = new google.maps.Marker({
  //     position: location,
  //     map: this.map,
  //     title: title,
  //     icon: {
  //       path: google.maps.SymbolPath.CIRCLE, // Use a simple circle for minimalist design
  //       scale: 6, // Adjust the size
  //       fillColor: '#1d58c6', // Color of the circle
  //       fillOpacity: 1, // Solid fill
  //       strokeWeight: 0, // No border for a cleaner look
  //     },
  //   });
  
  //   // Optionally, add a tooltip or info window
  //   const infoWindow = new google.maps.InfoWindow({
  //     content: `<div style="font-size: 14px;">${title}</div>`,
  //   });
  
  //   marker.addListener('click', () => {
  //     infoWindow.open(this.map, marker);
  //   });
  // }

  /*------------------------------------------
  Find Routes Connecting Current Location and Destination
  --------------------------------------------*/
  findRoutes() {
    if (!this.currentLocation || !this.destination) return;
  
    const routes = [...this.jeepneyRoutes, ...this.busRoutes];
  
    this.filteredRoutes = routes.filter((route) => {
      const hasStartStop = route.stops.some((stop: any) => this.isNearby(this.currentLocation!, stop));
      const hasEndStop = route.stops.some((stop: any) => this.isNearby(this.destination!, stop));
      return hasStartStop && hasEndStop; // Only include routes connecting current and destination
    });
  
    this.displayRoutes();
  }
  

  /*------------------------------------------
  IsNearby Function to Check if Location is Nearby
  --------------------------------------------*/

  isNearby(location: google.maps.LatLngLiteral, stop: any, threshold = 0.005): boolean {
    const distance = Math.sqrt(
      Math.pow(location.lat - stop.latitude, 2) + Math.pow(location.lng - stop.longitude, 2)
    );
    return distance <= threshold;
  }

  /*------------------------------------------
  Display Routes on Map
  --------------------------------------------*/

  displayRoutes() {
    this.filteredRoutes.forEach((route) => {
      const filteredStops = route.stops.filter((stop: any) =>
        this.isNearby(this.currentLocation!, stop) || this.isNearby(this.destination!, stop)
      );
  
      // Add markers for only the relevant stops
      filteredStops.forEach((stop: any) => {
        this.addMarker({ lat: stop.latitude, lng: stop.longitude }, route.routeName);
      });
    });
  }
  

  /*------------------------------------------
  Navigate to Destination
  --------------------------------------------*/
  navigateToDestination() {
    if (!this.currentLocation || !this.destination) {
      alert('Please set both current location and destination.');
      return;
    }
  
    const nearestStartStop = this.findNearestStop(this.currentLocation);
    const nearestEndStop = this.findNearestStop(this.destination);
  
    if (!nearestStartStop || !nearestEndStop) {
      alert('No nearby stops found for either current location or destination.');
      return;
    }
  
    // Show walking path to the nearest start stop
    this.displayWalkingPath(this.currentLocation, {
      lat: nearestStartStop.latitude,
      lng: nearestStartStop.longitude,
    });
  
    // Find and display transit route
    const routePath = this.findRoutePath(nearestStartStop, nearestEndStop);
    if (!routePath.length) {
      alert('No route found connecting the selected stops.');
      return;
    }
    this.displayRoutePath(routePath);
  
    // Show walking path from the last stop to the destination
    this.displayWalkingPath(
      { lat: nearestEndStop.latitude, lng: nearestEndStop.longitude },
      this.destination
    );
  }

  /*------------------------------------------
  Display Walking Path on Map
  --------------------------------------------*/

  displayWalkingPath(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) {
    const request = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.WALKING,
    };
  
    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        const walkingRenderer = new google.maps.DirectionsRenderer({
          map: this.map,
          polylineOptions: {
            strokeColor: '#00CCCC', // Green color for walking path
            strokeOpacity: 0, // Set opacity to 0 since icons will be used for dots
            strokeWeight: 2, // Thickness of the path
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.CIRCLE, // Small circle for dotted effect
                  scale: 3, // Size of the dots
                  fillColor: '#00CCCC', // Green color for the circles
                  fillOpacity: 1, // Solid fill for the circles
                  strokeOpacity: 1, // Full opacity for the dots
                },
                offset: '0', // Start from the beginning
                repeat: '15px', // Distance between dots
              },
            ],
          },
        });
        walkingRenderer.setDirections(result);
      } else {
        console.error('Walking directions request failed due to ' + status);
      }
    });
  }

  /*------------------------------------------
  Find Nearest Stop
  --------------------------------------------*/

  findNearestStop(location: google.maps.LatLngLiteral): any | null {
    const allStops = [...this.jeepneyRoutes, ...this.busRoutes]
      .flatMap((route) => route.stops);

    let nearestStop = null;
    let minDistance = Infinity;

    allStops.forEach((stop) => {
      const distance = Math.sqrt(
        Math.pow(location.lat - stop.latitude, 2) + Math.pow(location.lng - stop.longitude, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStop = stop;
      }
    });

    return nearestStop;
  }

  /*------------------------------------------
  Find Route Path
  --------------------------------------------*/

  findRoutePath(startStop: any, endStop: any): any[] {
    for (const route of [...this.jeepneyRoutes, ...this.busRoutes]) {
      const startIndex = route.stops.findIndex(
        (stop: any) => stop.id === startStop.id
      );
      const endIndex = route.stops.findIndex(
        (stop: any) => stop.id === endStop.id
      );

      // Check if both stops are on the same route and in the correct order
      if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
        return route.stops.slice(startIndex, endIndex + 1);
      }
    }

    return [];
  }

  /*------------------------------------------
  Get Route Information
  --------------------------------------------*/

  displayRoutePath(routePath: any[]) {
    if (routePath.length < 2) {
      console.error("Route path must have at least two stops to display a route.");
      return;
    }
  
    // Iterate through pairs of stops and request directions for each segment
    for (let i = 0; i < routePath.length - 1; i++) {
      const origin = {
        lat: routePath[i].latitude,
        lng: routePath[i].longitude,
      };
  
      const destination = {
        lat: routePath[i + 1].latitude,
        lng: routePath[i + 1].longitude,
      };
  
      const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING, // Use TRANSIT for routes
      };
  
      this.directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          const segmentRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            suppressMarkers: true, // Prevent duplicate markers for stops
            polylineOptions: {
              strokeColor: '#1d58c6', // Red for the route path
              strokeWeight: 8, // Thickness of the path
            },
          });
  
          segmentRenderer.setDirections(result);
        } else {
          console.error('Directions request failed for segment ' + i + ' due to ' + status);
        }
      });
    }
  
    // Add markers for each stop along the path
    routePath.forEach((stop: any) => {
      this.addMarker({ lat: stop.latitude, lng: stop.longitude }, stop.name);
    });
  }
}