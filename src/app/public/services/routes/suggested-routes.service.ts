import { Injectable } from '@angular/core';
import { RoutesService } from './routes.service';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SuggestedRoutesService {
  private routeCache = new Map<string, any>();
  private apiUrl = 'http://localhost:8000/api/navigation-histories';

  constructor(private routesService: RoutesService, private http: HttpClient) {}

  private getCacheKey(currentLocation: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral): string {
    return JSON.stringify({ currentLocation, destination });
  }

  private cacheRoutes(key: string, routes: any) {
    localStorage.setItem(key, JSON.stringify(routes));
  }

  private getCachedRoutes(key: string): any | null {
    const cachedRoutes = localStorage.getItem(key);
    if (cachedRoutes) {
      console.log('Suggested routes loaded from cache');
    }
    return cachedRoutes ? JSON.parse(cachedRoutes) : null;
  }

  getSuggestedRoutes(currentLocation: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) {
    const key = this.getCacheKey(currentLocation, destination);
    const cachedRoutes = this.getCachedRoutes(key);
    if (cachedRoutes) {
      return cachedRoutes;
    }
  
    const startWaypoint = this.routesService.findNearestStop(currentLocation);
    const endWaypoint = this.routesService.findNearestStop(destination);
  
    if (!startWaypoint || !endWaypoint) {
      return [];
    }
  
    const routes = this.routesService.findAllRoutePaths(startWaypoint, endWaypoint);
  
    // Cache the routes
    this.cacheRoutes(key, routes);
  
    // Return a flat array of routes with names
    return routes.map(route => ({
      path: route.path,
      color: route.color,
      start: startWaypoint,
      end: endWaypoint,
      name: this.routesService.getRouteById(route.routeId)?.routeName || 'Unknown Route',
      routeId: route.routeId
    }));
  }

  saveNavigationHistory(origin: string, destination: string, routeDetails: any, navigationConfirmed: boolean): Observable<any> {
    const body = { origin, destination, route_details: routeDetails, navigation_confirmed: navigationConfirmed };
    console.log('Saving navigation history:', body);
    return this.http.post(this.apiUrl, body).pipe(
      tap(response => console.log('Navigation history saved:', response)),
      catchError(error => {
        console.error('Error saving navigation history:', error);
        return throwError(error);
      })
    );
  }
}