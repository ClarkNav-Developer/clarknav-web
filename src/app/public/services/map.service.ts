import { Injectable } from '@angular/core';
import { RoutesService } from './routes.service';
import * as mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-sdk/services/directions';
import { environment } from '../../../environments/environment';
import { GeoJsonProperties } from 'geojson';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  public map!: mapboxgl.Map;
  private directionsClient: any;

  private markers: mapboxgl.Marker[] = [];
  private routeLayers: string[] = [];

  private routeColors = {
    J1: '#228B22',
    J2: '#D4B895',
    J3: '#1d58c6',
    J5: '#CE0000',
    B1: '#F98100',
  };

  private jeepneyRoutes: any[] = [];
  private filteredRoutes: any[] = [];

  currentLocation: mapboxgl.LngLat | null = null;
  destination: mapboxgl.LngLat | null = null;

  constructor(private routesService: RoutesService) {
    this.directionsClient = MapboxDirections({ accessToken: environment.mapboxApiKey });
  }

  /*------------------------------------------
  Initialization
  --------------------------------------------*/
  setMap(map: mapboxgl.Map) {
    this.map = map;
  }

  /*------------------------------------------
  Map Utilities
  --------------------------------------------*/
  clearMap() {
    this.clearMarkers();
    this.clearRouteLayers();
  }

  private clearMarkers() {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  }

  private clearRouteLayers() {
    this.routeLayers.forEach(layerId => {
      if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
      if (this.map.getSource(layerId)) this.map.removeSource(layerId);
    });
    this.routeLayers = [];
  }

  addMarker(location: mapboxgl.LngLat, title: string) {
    const marker = new mapboxgl.Marker()
      .setLngLat(location)
      .setPopup(new mapboxgl.Popup().setText(title))
      .addTo(this.map);

    this.markers.push(marker);
  }

  /*------------------------------------------
  Route Display
  --------------------------------------------*/
  displayRoutes() {
    this.filteredRoutes.forEach(route => {
      const relevantWaypoints = this.getRelevantWaypoints(route.waypoints);
      this.addMarkersForRoute(relevantWaypoints, route.routeName);
    });
  }

  private getRelevantWaypoints(waypoints: string[]) {
    return waypoints.filter(waypoint =>
      this.routesService.isNearby(this.currentLocation!, this.routesService.parseWaypoint(waypoint)) ||
      this.routesService.isNearby(this.destination!, this.routesService.parseWaypoint(waypoint))
    );
  }

  private addMarkersForRoute(waypoints: string[], routeName: string) {
    waypoints.forEach(waypoint => {
      const location = this.routesService.parseWaypoint(waypoint) as mapboxgl.LngLat;
      this.addMarker(location, routeName);
    });
  }

  displayRouteUsingDirectionsAPI(waypoints: mapboxgl.LngLat[], color: string) {
    if (waypoints.length < 2) return;

    this.directionsClient
      .getDirections({
        profile: 'driving',
        waypoints: waypoints.map(coord => ({ coordinates: [coord.lng, coord.lat] })),
        geometries: 'geojson',
      })
      .send()
      .then((response: any) => {
        const route = response.body.routes[0];
        const routeId = `route-${Date.now()}`;
        this.addRouteLayer(route.geometry, color, routeId);
      })
      .catch((error: any) => {
        console.error('Error fetching route directions:', error);
      });
  }

  private addRouteLayer(geometry: any, color: string, id: string) {
    if (!this.map.getSource(id)) {
      this.map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry,
          properties: {},
        },
      });

      this.map.addLayer({
        id,
        type: 'line',
        source: id,
        paint: {
          'line-color': color,
          'line-width': 4,
        },
      });

      this.routeLayers.push(id);
    }
  }

  /*------------------------------------------
  Route Segment Display (Replacement for displayRoutePath)
  --------------------------------------------*/
  displayRouteSegments(routePath: { path: mapboxgl.LngLat[], color: string }) {
    if (routePath.path.length < 2) {
      console.error('Route path must have at least two waypoints to display a route.');
      return;
    }

    const { path, color } = routePath;

    this.displayRouteUsingDirectionsAPI(path, color);

    path.forEach(waypoint => {
      this.addMarker(waypoint, 'Waypoint');
    });
  }

  /*------------------------------------------
  Walking Path Display
  --------------------------------------------*/
  displayWalkingPath(origin: mapboxgl.LngLat, destination: mapboxgl.LngLat, color: string) {
    const distance = this.calculateDistance(origin, destination);

    if (distance < 50) {
      this.renderStaticWalkingPath(origin, destination, color);
    } else {
      this.displayRouteUsingDirectionsAPI([origin, destination], color);
    }
  }

  private renderStaticWalkingPath(origin: mapboxgl.LngLat, destination: mapboxgl.LngLat, color: string) {
    const walkingPathId = `walking-path-${Date.now()}`;
    const pathData: GeoJSON.Feature<GeoJSON.Geometry, GeoJsonProperties> = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
      },
      properties: {},
    };

    if (!this.map.getSource(walkingPathId)) {
      this.map.addSource(walkingPathId, {
        type: 'geojson',
        data: pathData,
      });

      this.map.addLayer({
        id: walkingPathId,
        type: 'line',
        source: walkingPathId,
        paint: {
          'line-color': color,
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });

      this.routeLayers.push(walkingPathId);
    }
  }

  /*------------------------------------------
  Helper Methods
  --------------------------------------------*/
  private calculateDistance(pointA: mapboxgl.LngLat, pointB: mapboxgl.LngLat): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (pointA.lat * Math.PI) / 180;
    const φ2 = (pointB.lat * Math.PI) / 180;
    const Δφ = ((pointB.lat - pointA.lat) * Math.PI) / 180;
    const Δλ = ((pointB.lng - pointA.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
