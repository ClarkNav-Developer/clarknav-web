import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapService } from '../../services/map.service';
import { NavigationService } from '../../services/navigation.service';
import { RoutesService } from '../../services/routes.service';
import { environment } from '../../../../environments/environment';
import * as mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  constructor(
    private http: HttpClient,
    private mapService: MapService,
    private navigationService: NavigationService,
    private routesService: RoutesService
  ) { }

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
        const map = new mapboxgl.Map({
          container: mapElement,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [120.55950164794922, 15.187769063648858],
          zoom: 14,
          minZoom: 14,
          accessToken: environment.mapboxApiKey
        });

        this.mapService.setMap(map);

        this.routesService.loadRoutes();
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    } else {
      console.error('Map element not found!');
    }
  }
}