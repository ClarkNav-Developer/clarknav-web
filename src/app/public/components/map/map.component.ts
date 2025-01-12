import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapService } from '../../services/map.service';
import { NavigationService } from '../../services/navigation.service';

declare var google: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  constructor(private http: HttpClient, private mapService: MapService, private navigationService: NavigationService) { }

  ngOnInit(): void {
    this.loadMapStyle().subscribe(style => {
      this.initMap(style);
    });
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

        this.mapService.setMap(map);

        this.navigationService.loadRoutes();
        this.navigationService.displayAllJeepneyWaypoints();
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    } else {
      console.error('Map element not found!');
    }
  }
}