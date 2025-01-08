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
  markers: google.maps.Marker[] = [];
  routeRenderers: google.maps.DirectionsRenderer[] = [];

  // Coordinates for Clark's bounds
  private clarkBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(15.15350883733786, 120.4702890088466),  // Southwest coordinates of Clark
    new google.maps.LatLng(15.24182812878962, 120.5925078185926)   // Northeast coordinates of Clark
  );

  // Declare but do not initialize the observable
  isFloatingVisible: any;

  constructor(public floatingWindowService: FloatingWindowService, private http: HttpClient) { }

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
      this.jeepneyRoutes = data.routes.jeepney;
      this.busRoutes = data.routes.bus;
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
      try {
        this.map = new google.maps.Map(mapElement as HTMLElement, {
          center: { lat: 15.187769063648858, lng: 120.55950164794922 },
          zoom: 14,
          minZoom: 14, // Limit zoom out to level 14
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          styles: style
        });
  
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
          map: this.map,
          preserveViewport: true
        });
  
        // Create and display the Traffic Layer
        // const trafficLayer = new google.maps.TrafficLayer();
        // trafficLayer.setMap(this.map);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
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
  Clear Map
  --------------------------------------------*/
  clearMap() {
    // Remove all markers
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    // Remove all route renderers
    this.routeRenderers.forEach(renderer => renderer.setMap(null));
    this.routeRenderers = [];
  }

  /*------------------------------------------
  Add Marker to Map
  --------------------------------------------*/
  addMarker(location: google.maps.LatLngLiteral, title: string) {
    const marker = new google.maps.Marker({
      position: location,
      map: this.map,
      title: title
    });
    this.markers.push(marker);
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
      const hasStartWaypoint = route.waypoints.some((waypoint: string) => this.isNearby(this.currentLocation!, this.parseWaypoint(waypoint)));
      const hasEndWaypoint = route.waypoints.some((waypoint: string) => this.isNearby(this.destination!, this.parseWaypoint(waypoint)));
      return hasStartWaypoint && hasEndWaypoint; // Only include routes connecting current and destination
    });

    this.displayRoutes();
  }

  parseWaypoint(waypoint: string): google.maps.LatLngLiteral {
    const [lat, lng] = waypoint.split(',').map(coord => parseFloat(coord.trim()));
    return { lat, lng };
  }

  /*------------------------------------------
  IsNearby Function to Check if Location is Nearby
  --------------------------------------------*/

  isNearby(location: google.maps.LatLngLiteral, waypoint: google.maps.LatLngLiteral, threshold = 0.05): boolean {
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
    const lat1 = toRadians(location.lat);
    const lng1 = toRadians(location.lng);
    const lat2 = toRadians(waypoint.lat);
    const lng2 = toRadians(waypoint.lng);
  
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
  
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = 6371 * c; // Radius of Earth in kilometers
  
    return distance <= threshold;
  }

  /*------------------------------------------
  Display Routes on Map
  --------------------------------------------*/

  displayRoutes() {
    this.filteredRoutes.forEach((route) => {
      const filteredWaypoints = route.waypoints.filter((waypoint: string) =>
        this.isNearby(this.currentLocation!, this.parseWaypoint(waypoint)) || this.isNearby(this.destination!, this.parseWaypoint(waypoint))
      );

      // Add markers for only the relevant waypoints
      filteredWaypoints.forEach((waypoint: string) => {
        const location = this.parseWaypoint(waypoint);
        this.addMarker(location, route.routeName);
      });
    });
  }


  /*------------------------------------------
    Navigate to Destination
    --------------------------------------------*/
  navigateToDestination() {
    console.log('Navigating to destination');
    if (!this.currentLocation || !this.destination) {
      alert('Please set both current location and destination.');
      return;
    }

    // Clear the map before displaying new routes
    this.clearMap();

    const nearestStartWaypoint = this.findNearestStop(this.currentLocation);
    const nearestEndWaypoint = this.findNearestStop(this.destination);

    if (!nearestStartWaypoint || !nearestEndWaypoint) {
      alert('No nearby waypoints found for either current location or destination.');
      return;
    }

    // Show walking path to the nearest start waypoint
    this.displayWalkingPath(this.currentLocation, nearestStartWaypoint);

    // Find the route path between the nearest waypoints
    const routePath = this.findRoutePath(nearestStartWaypoint, nearestEndWaypoint);
    if (routePath.path.length === 0) {
      alert('No route found connecting the selected stops.');
      return;
    }
    this.displayRoutePath(routePath);

    // Show walking path from the nearest end waypoint to the destination
    this.displayWalkingPath(nearestEndWaypoint, this.destination);

    // // Zoom in on the destination first
    // console.log('Centering map on destination:', this.destination);
    // this.map.setCenter(this.destination);
    // this.map.setZoom(18); // Zoom in to level 18

    // // After a few seconds, pan and zoom to the user's origin
    // setTimeout(() => {
    //   console.log('Centering map on current location:', this.currentLocation);
    //   this.map.panTo(this.currentLocation);
    //   this.map.setZoom(18); // Zoom in to level 16
    // }, 3000); // 3-second delay
  }


  /*------------------------------------------
  Display Walking Path on Map
  --------------------------------------------*/

  displayWalkingPath(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(origin.lat, origin.lng),
      new google.maps.LatLng(destination.lat, destination.lng)
    );
  
    const threshold = 50; // Distance in meters to switch between direct path and road-following path
  
    if (distance < threshold) {
      // Draw a direct path
      const walkingPath = new google.maps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: '#00CCCC',
        strokeOpacity: 0, // Set opacity to 0 since icons will be used for dots
        strokeWeight: 2,
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
      });
  
      walkingPath.setMap(this.map);
      this.routeRenderers.push(walkingPath);
    } else {
      // Follow the road
      const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.WALKING,
      };
  
      this.directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          const walkingRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            preserveViewport: true,
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
          this.routeRenderers.push(walkingRenderer);
        } else {
          console.error('Walking directions request failed due to ' + status);
        }
      });
    }
  }

  /*------------------------------------------
  Find Nearest Stop
  --------------------------------------------*/

  findNearestStop(location: google.maps.LatLngLiteral): google.maps.LatLngLiteral | null {
    const allWaypoints = [...this.jeepneyRoutes, ...this.busRoutes]
      .flatMap((route) => route.waypoints)
      .map(this.parseWaypoint);

    let nearestWaypoint = null;
    let minDistance = Infinity;

    allWaypoints.forEach((waypoint) => {
      const distance = Math.sqrt(
        Math.pow(location.lat - waypoint.lat, 2) + Math.pow(location.lng - waypoint.lng, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestWaypoint = waypoint;
      }
    });

    return nearestWaypoint;
  }

  /*------------------------------------------
  Find Route Path
  --------------------------------------------*/

  findRoutePath(startWaypoint: google.maps.LatLngLiteral, endWaypoint: google.maps.LatLngLiteral): { path: google.maps.LatLngLiteral[], direction: string } {
    const isNorthbound = startWaypoint.lat < endWaypoint.lat;  // Current location is south of destination, so traveling northbound
    const isSouthbound = startWaypoint.lat > endWaypoint.lat;  // Current location is north of destination, so traveling southbound
  
    for (const route of [...this.jeepneyRoutes, ...this.busRoutes]) {
      const startIndex = route.waypoints.findIndex(
        (waypoint: string) => this.isNearby(this.parseWaypoint(waypoint), startWaypoint)
      );
      const endIndex = route.waypoints.findIndex(
        (waypoint: string) => this.isNearby(this.parseWaypoint(waypoint), endWaypoint)
      );
  
      // Check if both waypoints are on the same route
      if (startIndex !== -1 && endIndex !== -1) {
        if (isNorthbound) {
          // For Northbound Routes: Start comes before End (startIndex <= endIndex)
          if (startIndex <= endIndex) {
            console.log('Using Northbound data');
            return { path: route.waypoints.slice(startIndex, endIndex + 1).map(this.parseWaypoint), direction: 'NB' }; // Northbound route
          }
        } else if (isSouthbound) {
          // For Southbound Routes: End comes before Start (startIndex > endIndex)
          if (startIndex >= endIndex) {
            console.log('Using Southbound data');
            return { path: route.waypoints.slice(endIndex, startIndex + 1).map(this.parseWaypoint).reverse(), direction: 'SB' }; // Southbound route
          }
        }
      }
    }
    return { path: [], direction: '' };
  }


  /*------------------------------------------
  Get Route Information
  --------------------------------------------*/

  displayRoutePath(routePath: { path: google.maps.LatLngLiteral[], direction: string }) {
    if (routePath.path.length < 2) {
      console.error("Route path must have at least two waypoints to display a route.");
      return;
    }
  
    const pathColor = routePath.direction === 'NB' ? '#1d58c6' : '#FF0000'; // Blue for NB, Red for SB
  
    // Iterate through pairs of waypoints and request directions for each segment
    for (let i = 0; i < routePath.path.length - 1; i++) {
      const origin = routePath.path[i];
      const destination = routePath.path[i + 1];
  
      const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING, // Use TRANSIT for routes
      };
  
      this.directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          const segmentRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            preserveViewport: true,
            suppressMarkers: true, // Prevent duplicate markers for waypoints
            polylineOptions: {
              strokeColor: pathColor, // Color based on direction
              strokeWeight: 5, // Thickness of the path
            },
          });
  
          segmentRenderer.setDirections(result);
          this.routeRenderers.push(segmentRenderer);
        } else {
          console.error('Directions request failed for segment ' + i + ' due to ' + status);
        }
      });
    }
  
    // Add markers for each waypoint along the path
    routePath.path.forEach((waypoint: google.maps.LatLngLiteral) => {
      this.addMarker(waypoint, 'Waypoint');
    });
  }
}
