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

  private clarkBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(15.167864949136394, 120.48439979553223),
    new google.maps.LatLng(15.22415233433501, 120.58105440940092)
  );

  isFloatingVisible: any;

  constructor(
    private http: HttpClient,
    private floatingWindowService: FloatingWindowService
  ) {}

  ngOnInit(): void {
    this.isFloatingVisible = this.floatingWindowService.isVisible$;
    this.initMap();
    this.initAutocomplete();
    this.initCurrentLocationAutocomplete();
    this.loadRoutes();
  }

  loadRoutes() {
    this.http.get('assets/routes.json').subscribe((data: any) => {
      this.jeepneyRoutes = data.jeepneyRoutes;
      this.busRoutes = data.busRoutes;
    });
  }

  initMap() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
      this.map = new google.maps.Map(mapElement as HTMLElement, {
        center: { lat: 15.187769063648858, lng: 120.55950164794922 },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer();
      this.directionsRenderer.setMap(this.map);
    } else {
      console.error('Map element not found!');
    }
  }

  initAutocomplete() {
    const input = document.getElementById('search-box') as HTMLInputElement;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'PH' },
      bounds: this.clarkBounds,
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

  initCurrentLocationAutocomplete() {
    const input = document.getElementById('current-location-box') as HTMLInputElement;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'PH' },
      bounds: this.clarkBounds,
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
        this.findRoutes();
      }
    });
  }

  useMyLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          const input = document.getElementById('current-location-box') as HTMLInputElement;
          input.value = `Lat: ${this.currentLocation.lat}, Lng: ${this.currentLocation.lng}`;

          this.addMarker(this.currentLocation, 'Your Location');
          this.map.setCenter(this.currentLocation);
          this.findRoutes();
        },
        (error) => {
          console.error('Error getting current location', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  addMarker(location: google.maps.LatLngLiteral, title: string) {
    new google.maps.Marker({
      position: location,
      map: this.map,
      title: title,
    });
  }

  findRoutes() {
    if (!this.currentLocation || !this.destination) return;

    const routes = [...this.jeepneyRoutes, ...this.busRoutes];

    this.filteredRoutes = routes.filter((route) => {
      return route.stops.some((stop: any) =>
        this.isNearby(this.currentLocation!, stop) || this.isNearby(this.destination!, stop)
      );
    });

    this.displayRoutes();
  }

  isNearby(location: google.maps.LatLngLiteral, stop: any, threshold = 0.005): boolean {
    const distance = Math.sqrt(
      Math.pow(location.lat - stop.latitude, 2) + Math.pow(location.lng - stop.longitude, 2)
    );
    return distance <= threshold;
  }

  displayRoutes() {
    this.filteredRoutes.forEach((route) => {
      route.stops.forEach((stop: any) => {
        this.addMarker({ lat: stop.latitude, lng: stop.longitude }, route.routeName);
      });
    });
  }

  // navigateToDestination() {
  //   if (this.currentLocation && this.destination) {
  //     const request = {
  //       origin: this.currentLocation,
  //       destination: this.destination,
  //       travelMode: google.maps.TravelMode.TRANSIT,
  //     };

  //     this.directionsService.route(request, (result: any, status: any) => {
  //       if (status === google.maps.DirectionsStatus.OK) {
  //         this.directionsRenderer.setDirections(result);
  //       } else {
  //         console.error('Directions request failed due to ' + status);
  //       }
  //     });
  //   } else {
  //     alert('Please set both current location and destination.');
  //   }
  // }

  navigateToDestination() {
    if (!this.currentLocation || !this.destination) {
      alert('Please set both current location and destination.');
      return;
    }
  
    // Find nearest stops to the current location and destination
    const nearestStartStop = this.findNearestStop(this.currentLocation);
    const nearestEndStop = this.findNearestStop(this.destination);
  
    if (!nearestStartStop || !nearestEndStop) {
      alert('No nearby stops found for either current location or destination.');
      return;
    }
  
    // Find the route connecting the two stops
    const routePath = this.findRoutePath(nearestStartStop, nearestEndStop);
  
    if (!routePath.length) {
      alert('No route found connecting the selected stops.');
      return;
    }
  
    // Get the travel mode selected by the user
    const travelMode = google.maps.TravelMode.TRANSIT; // Default to walking
  
    // Display the route using the selected travel mode
    this.displayRoute(travelMode, routePath);
  }

  displayRoute(travelMode: google.maps.TravelMode, routePath: any[]) {
    const request = {
      origin: this.currentLocation,
      destination: this.destination,
      travelMode: travelMode,
    };
  
    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        this.directionsRenderer.setDirections(result);
      } else {
        console.error('Directions request failed due to ' + status);
      }
    });
  
    // Optionally display the path of stops
    const pathCoordinates = routePath.map((stop: any) => ({
      lat: stop.latitude,
      lng: stop.longitude,
    }));
  
    const routePolyline = new google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2,
    });
  
    routePolyline.setMap(this.map);
  
    // Add markers for each stop along the path
    routePath.forEach((stop: any) => {
      this.addMarker({ lat: stop.latitude, lng: stop.longitude }, stop.name);
    });
  }

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


}
