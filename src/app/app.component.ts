import { Component, OnInit } from '@angular/core';
import { environment } from '../environments/environment';
import { MapInstanceService } from './public/services/map/map-instance.service';
import { MapStyleService } from './public/services/map/map-style.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  constructor(
    private mapInstanceService: MapInstanceService,
    private mapStyleService: MapStyleService
  ) {}

  ngOnInit() {
    this.loadGoogleMapsApi();
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      document.body.classList.add('dark-mode');
      this.setInitialMapStyle('assets/darkmap.json');
    } else {
      this.setInitialMapStyle('assets/retro.json');
    }
  }

  loadGoogleMapsApi() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.initializeMap();
    };
    document.head.appendChild(script);
  }

  initializeMap() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
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