// filepath: /workspaces/clarknav-web/src/app/public/components/map/map.component.ts
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { MapService } from '../../services/map.service';
import { NavigationService } from '../../services/navigation.service';
import { RoutesService } from '../../services/routes.service';
import { MapStyleService } from '../../services/map-style.service';
import { MapInstanceService } from '../../services/map-instance.service';
import {WebsocketService} from '../../services/websocket.service';
import { Subscription } from 'rxjs';

declare var google: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {
  private gpsSubscription: Subscription | null = null; // To manage WebSocket subscriptions

  constructor(
    private mapService: MapService,
    private navigationService: NavigationService,
    private routesService: RoutesService,
    private mapStyleService: MapStyleService,
    private mapInstanceService: MapInstanceService,
    private websocketService: WebsocketService
  ) { }

  ngOnInit(): void {
    const savedMode = localStorage.getItem('darkMode');
    const styleUrl = savedMode === 'true' ? 'assets/darkmap.json' : 'assets/retro.json';
    this.mapStyleService.loadMapStyle(styleUrl).subscribe(style => {
      this.initMap(style);
    });

    // Subscribe to real-time GPS updates
    this.websocketService.on('gpsUpdate', (data) => {
      console.log('Real-time GPS update:', data);
      this.mapService.updateRealTimeLocation(data); // Pass data to MapService
    });
  }

  ngAfterViewInit(): void {
    const savedMode = localStorage.getItem('darkMode');
    const styleUrl = savedMode === 'true' ? 'assets/darkmap.json' : 'assets/retro.json';
    this.mapStyleService.loadMapStyle(styleUrl).subscribe(style => {
      this.initMap(style);
    });
  }

  initMap(style: any) {
    const mapElement = document.getElementById('map');
    if (mapElement) {
      try {
        const map = new google.maps.Map(mapElement as HTMLElement, {
          center: { lat: 15.187769063648858, lng: 120.55950164794922 },
          zoom: 14,
          minZoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          styles: style
        });

        this.mapInstanceService.setMap(map);
        this.mapService.initializeMap(map);
        this.routesService.loadRoutes();
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    } else {
      console.error('Map element not found!');
    }
  }

  ngOnDestroy(): void {
    if (this.gpsSubscription) {
      this.gpsSubscription.unsubscribe(); // Unsubscribe to avoid memory leaks
    }
  }
}