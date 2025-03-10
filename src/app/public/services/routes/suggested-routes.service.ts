import { Injectable } from '@angular/core';
import { RoutesService } from './routes.service';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RouteUsage } from '../../../models/routeusage';

@Injectable({
  providedIn: 'root'
})
export class SuggestedRoutesService {
  private routeCache = new Map<string, any>();

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

    const routes: Array<{ path: google.maps.LatLngLiteral[], color: string, routeId: string, name?: string, description?: string }> = [];

    if (startWaypoint && endWaypoint) {
      const allRoutes = this.routesService.findAllRoutePaths(startWaypoint, endWaypoint);

      // Filter routes based on direction
      const filteredRoutes = allRoutes.filter(route => {
        const isNorthbound = route.routeId === 'B1';
        const isSouthbound = route.routeId === 'B2';

        if (isNorthbound) {
          return startWaypoint.lat < endWaypoint.lat;
        } else if (isSouthbound) {
          return startWaypoint.lat > endWaypoint.lat;
        }

        return true;
      });

      routes.push(...filteredRoutes);
    }

    // Add taxi route using Directions API
    routes.push({
      path: [currentLocation, destination],
      color: '#088F8F', // Blue Green color for taxi
      routeId: 'taxi',
      name: 'Taxi', // Set the name for the taxi route
      description: 'Direct taxi route'
    });

    // Add walking route using Directions API
    routes.push({
      path: [currentLocation, destination],
      color: '#8400ff', // Purple color for walking
      routeId: 'walking',
      name: 'Walking', // Set the name for the walking route
      description: 'Direct walking route'
    });

    // Cache the routes
    this.cacheRoutes(key, routes);

    // Return a flat array of routes with names and descriptions
    return routes.map(route => ({
      path: route.path,
      color: route.color,
      start: startWaypoint,
      end: endWaypoint,
      name: route.name || this.routesService.getRouteById(route.routeId)?.routeName || 'Unknown Route',
      description: route.description || this.routesService.getRouteById(route.routeId)?.description || 'No description available',
      routeId: route.routeId
    }));
  }

  saveNavigationHistory(origin: string, destination: string, routeDetails: any, navigationConfirmed: boolean): Observable<any> {
    const body = { origin, destination, route_details: routeDetails, navigation_confirmed: navigationConfirmed };
    console.log('Saving navigation history:', body);
    return this.http.post(environment.navigationHistoriesUrl, body).pipe(
      tap(response => console.log('Navigation history saved:', response)),
      catchError(error => {
        console.error('Error saving navigation history:', error);
        return throwError(error);
      })
    );
  }

  storeRouteUsage(routeUsage: RouteUsage): Observable<RouteUsage> {
    console.log('Storing route usage:', routeUsage); // Debugging log
    return this.http.post<RouteUsage>(environment.routeUsagesUrl, routeUsage).pipe(
      tap(response => console.log('Route usage saved:', response)),
      catchError(error => {
        console.error('Error saving route usage:', error);
        return throwError(error);
      })
    );
  }
}