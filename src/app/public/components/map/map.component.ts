import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { MapService } from '../../services/map/map.service';
import { NavigationService } from '../../services/navigation/navigation.service';
import { RoutesService } from '../../services/routes/routes.service';
import { MapStyleService } from '../../services/map/map-style.service';
import { MapInstanceService } from '../../services/map/map-instance.service';
import { WebsocketService } from '../../services/websocket/websocket.service';
import { Subscription } from 'rxjs';
import { GoogleMapsLoaderService } from '../../services/geocoding/google-maps-loader.service';

declare var google: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private gpsSubscription: Subscription | null = null; // To manage WebSocket subscriptions
  private autoCenterTimeout: any; // To manage auto-center timeout

  constructor(
    private mapService: MapService,
    private navigationService: NavigationService,
    private routesService: RoutesService,
    private mapStyleService: MapStyleService,
    private mapInstanceService: MapInstanceService,
    private websocketService: WebsocketService,
    private googleMapsLoader: GoogleMapsLoaderService // Add this line
  ) { }

  ngOnInit(): void {
    // Subscribe to real-time GPS updates
    this.websocketService.on('gpsUpdate', (data) => {
      console.debug('Real-time GPS update:', data);
      this.mapService.updateRealTimeLocation(data); // Pass data to MapService
    });
  }

  ngAfterViewInit(): void {
    this.googleMapsLoader.load().then(() => {
      const savedMode = localStorage.getItem('darkMode');
      const styleUrl = savedMode === 'true' ? 'assets/darkmap.json' : 'assets/retro.json';
  
      this.mapStyleService.loadMapStyle(styleUrl).subscribe(async (style) => {
        await this.initMap(style); // Ensure map is fully initialized
      });
    }).catch(error => {
      console.error('Error loading Google Maps API:', error);
    });
  }
  

  initMap(style: any) {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map element not found! Ensure the DOM is fully loaded.');
      return;
    }

    try {
      const map = new google.maps.Map(mapElement as HTMLElement, {
        center: { lat: 15.187481337206234, lng: 120.52909237418034 },
        zoom: 14,
        minZoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        styles: style,
      });

      this.mapInstanceService.setMap(map);
      this.mapService.initializeMap(map);
      this.routesService.loadRoutes();

      map.addListener('dragstart', () => this.onUserInteraction());
      map.addListener('zoom_changed', () => this.onUserInteraction());
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  onUserInteraction() {
    // Disable auto-centering
    this.mapService.disableAutoCenter();

    // Clear any existing timeout
    if (this.autoCenterTimeout) {
      clearTimeout(this.autoCenterTimeout);
    }

    // Re-enable auto-centering after 10 seconds
    this.autoCenterTimeout = setTimeout(() => {
      this.mapService.enableAutoCenter();
      if (this.mapService.currentLocation) {
        this.mapService.centerMapOnRealTimeLocation();
      }
    }, 10000); // 10 seconds
  }

  ngOnDestroy(): void {
    if (this.gpsSubscription) {
      this.gpsSubscription.unsubscribe(); // Unsubscribe to avoid memory leaks
    }
    if (this.autoCenterTimeout) {
      clearTimeout(this.autoCenterTimeout);
    }
  }
}