import { Component, OnInit } from '@angular/core';
import { environment } from '../environments/environment';
import { MapInstanceService } from './public/services/map/map-instance.service';
import { MapStyleService } from './public/services/map/map-style.service';
import { MapService } from './public/services/map/map.service';
import { GoogleMapsLoaderService } from './public/services/geocoding/google-maps-loader.service';
import { FloatingWindowService } from './floating-window.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  constructor(
    private mapInstanceService: MapInstanceService,
    private mapStyleService: MapStyleService,
    private googleMapsLoader: GoogleMapsLoaderService, // Add this line
    public floatingWindowService: FloatingWindowService
  ) {}

  ngOnInit() {
    this.googleMapsLoader.load().then(() => {
      this.initializeMap();
    }).catch(error => {
      console.error('Error loading Google Maps API:', error);
    });
  }


  initializeMap() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      document.body.classList.add('dark-mode');
      this.setInitialMapStyle('assets/darkmap.json');
    } else {
      this.setInitialMapStyle('assets/retro.json');
    }
  }

  setInitialMapStyle(styleUrl: string) {
    this.mapStyleService.loadMapStyle(styleUrl).subscribe(style => {
      this.mapInstanceService.setMapStyle(style);
    });
  }
}