import { Injectable } from '@angular/core';
import { RoutesService } from './routes.service';

@Injectable({
  providedIn: 'root'
})
export class SuggestedRoutesService {
  constructor(private routesService: RoutesService) {}

  getSuggestedRoutes(currentLocation: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) {
    const startWaypoint = this.routesService.findNearestStop(currentLocation);
    const endWaypoint = this.routesService.findNearestStop(destination);
  
    if (!startWaypoint || !endWaypoint) {
      return [];
    }
  
    const routes = this.routesService.findAllRoutePaths(startWaypoint, endWaypoint);
  
    // Return a flat array of routes
    return routes.map(route => ({
      path: route.path,
      color: route.color,
      start: startWaypoint,
      end: endWaypoint,
    }));
  }
  
}