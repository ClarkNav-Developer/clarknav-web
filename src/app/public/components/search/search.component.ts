import { Component, OnInit, AfterViewInit, Renderer2 } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapService } from '../../services/map.service';
import { NavigationService } from '../../services/navigation.service';
import { SuggestedRoutesService } from '../../services/suggested-routes.service';
import { environment } from '../../../../environments/environment';
import * as mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import MapboxDirections from '@mapbox/mapbox-sdk/services/directions';
import MapboxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';
import { Observable } from 'rxjs';
import { MapboxSearchService } from '../../services/mapbox-search.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit, AfterViewInit {
  // Locations and addresses
  currentLocation: mapboxgl.LngLatLike | null = null;
  destination: mapboxgl.LngLatLike | null = null;
  currentLocationAddress = 'Loading...';
  destinationAddress = 'Loading...';

  // UI state
  showNavigationWindow = false;
  isBottomSheetVisible = false;
  showAllRoutes = true;

  // Route data
  suggestedRoutes: any[] = [];
  selectedRoute: any;
  highlightedRoute: any = null;

  searchQuery: string = '';
  results: any[] = [];

  // SearchBox API URL for search
  private apiUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/{searchQuery}.json';


  // Dragging state for the bottom sheet
  private isDragging = false;
  private startY = 0;
  private startHeight = 0;

  private directionsClient = MapboxDirections({ accessToken: environment.mapboxApiKey });
  private geocodingClient = MapboxGeocoding({ accessToken: environment.mapboxApiKey });

  constructor(
    private mapService: MapService,
    private navigationService: NavigationService,
    private suggestedRoutesService: SuggestedRoutesService,
    private renderer: Renderer2,
    private http: HttpClient,
    private mapboxSearchService: MapboxSearchService // Ensure this service is injected
  ) { }

  /*------------------------------------------
  Lifecycle Hooks
  --------------------------------------------*/
  ngOnInit(): void {
    // Initialize Mapbox map
    this.mapService.setMap(new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [120.55950164794922, 15.187769063648858],
      zoom: 14,
      accessToken: environment.mapboxApiKey
    }));

    // Add Mapbox Geocoder
    const geocoder = new MapboxGeocoder({
      accessToken: environment.mapboxApiKey,
      mapboxgl: mapboxgl
    });

    const geocoderElement = document.getElementById('geocoder');
    if (geocoderElement) {
      geocoderElement.appendChild(geocoder.onAdd(this.mapService.map));
    } else {
      console.error('Geocoder element not found.');
    }
  }

  ngAfterViewInit(): void {
    this.setupBottomSheetDragging();
    this.initializeSearchBox();
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
    this.navigationService.navigateToDestination();

    this.isBottomSheetVisible = true;
  }

  fetchSuggestedRoutes(): void {
    if (this.currentLocation && this.destination) {
      const currentLocationLiteral = { lat: (this.currentLocation as mapboxgl.LngLat).lat, lng: (this.currentLocation as mapboxgl.LngLat).lng };
      const destinationLiteral = { lat: (this.destination as mapboxgl.LngLat).lat, lng: (this.destination as mapboxgl.LngLat).lng };
      const routes = this.suggestedRoutesService.getSuggestedRoutes(currentLocationLiteral, destinationLiteral);

      if (routes.length > 0) {
        this.suggestedRoutes = routes.map(route => ({
          ...route,
          start: this.currentLocation,
          end: this.destination,
          distanceInKm: this.calculateDistance(route.start, route.end),
        }));

        this.suggestedRoutes.forEach(route => {
          this.calculateFare(route);
          this.calculateDuration(route);
        });

        this.renderRoutesOnMap();
      } else {
        console.error('No suggested routes found.');
      }
    } else {
      console.error('Current location or destination not set.');
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
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };
        this.resolveAddresses();
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

  private geocodeLatLng(latLng: mapboxgl.LngLatLike, callback: (address: string) => void): void {
    this.geocodingClient.reverseGeocode({
      query: latLng,
      limit: 1
    }).send().then((response: any) => {
      const result = response.body.features[0];
      if (result) {
        callback(result.place_name);
      } else {
        callback('Address not found');
      }
    }).catch((error: any) => {
      console.error('Geocoder failed due to:', error);
      callback('Address not found');
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

  private calculateDistance(start: mapboxgl.LngLatLike, end: mapboxgl.LngLatLike): number {
    const startLatLng = Array.isArray(start) ? new mapboxgl.LngLat(start[0], start[1]) : new mapboxgl.LngLat('lng' in start ? start.lng : start.lon, start.lat);
    const endLatLng = Array.isArray(end) ? new mapboxgl.LngLat(end[0], end[1]) : new mapboxgl.LngLat('lng' in end ? end.lng : end.lon, end.lat);
    return startLatLng.distanceTo(endLatLng) / 1000;
  }

  private calculateDuration(route: any): void {
    if (this.currentLocation && this.destination) {
      this.directionsClient.getDirections({
        profile: 'driving',
        waypoints: [
          { coordinates: (this.currentLocation as mapboxgl.LngLat).toArray() },
          { coordinates: (this.destination as mapboxgl.LngLat).toArray() }
        ]
      }).send().then((response: any) => {
        const duration = response.body.routes[0].duration;
        route.duration = `${Math.round(duration / 60)} mins`;
      }).catch((error: any) => {
        console.error('Error fetching duration:', error);
      });
    } else {
      console.error('Current location or destination is null.');
    }
  }

  /*------------------------------------------
  Autocomplete Initialization
  --------------------------------------------*/

  // Method to perform location search using Mapbox API
  search(query: string): Observable<any> {
    const proximityCoordinates = [120.55950164794922, 15.187769063648858]; // Your specified location
    
    const params = {
      q: query,
      access_token: environment.mapboxApiKey,
      limit: '5', // Limit the results
      proximity: proximityCoordinates.join(','), // Proximity bias parameter
    };
    
    // Perform the search with proximity bias
    return this.http.get(this.apiUrl.replace("{searchQuery}", query), { params });
  }

  onSearch(event: any) {
    const query = event.target.value;
    if (query) {
      this.mapboxSearchService.search(query).subscribe(results => {
        this.results = results.features || [];
      });
    } else {
      this.results = [];
    }
  }



  

  // Initialize SearchBox autocomplete logic
  private initializeSearchBox(): void {
    const searchInput = document.getElementById('search-box-2') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (event: Event) => {
        const searchQuery = (event.target as HTMLInputElement).value;
        if (searchQuery) {
          this.mapboxSearchService.search(searchQuery).subscribe(results => {
            this.results = results['features'] || [];
            console.log('Search results:', this.results);
          });
        }
      });
    }
  }

  // You can add a method to handle location selection from the search result
  selectLocation(result: any) {
    this.searchQuery = result.place_name;
    this.results = [];
    this.destination = result.center;
    if (this.destination) {
      this.mapService.map.setCenter(this.destination);
    }
    this.resolveLocationAddress(result);
  }

  navigateToLocation(location: any) {
    // Implement your logic to navigate to the location on the map
    // For example:
    // this.mapService.setView(location.coordinates);
  }

  // Resolve and display the address for the selected location
  private resolveLocationAddress(location: any): void {
    this.geocodeLatLng(location.center, (address: string) => {
      this.destinationAddress = address || 'Unable to resolve address';
    });
  }
}
