import { Injectable } from '@angular/core';
import { RoutesService } from './routes.service';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RouteUsage } from '../../../models/routeusage';
import { AuthService } from '../../../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SuggestedRoutesService {
  private routeCache = new Map<string, any>();
  private isLoggedIn: boolean = false;

  constructor(private routesService: RoutesService, private http: HttpClient, private authService: AuthService) {
    this.checkAuthentication();
  }

  private checkAuthentication(): void {
    this.authService.isAuthenticated.subscribe(isAuthenticated => {
      console.log('Is Authenticated:', isAuthenticated); // Debugging: Check authentication state
      this.isLoggedIn = isAuthenticated;
    });
  }

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

    this.cacheRoutes(key, routes);

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
    if (!this.isLoggedIn) {
      console.log('User is not authenticated. Navigation history will not be saved.');
      return throwError(() => new Error('User is not authenticated.'));
    }

    const body = { origin, destination, route_details: routeDetails, navigation_confirmed: navigationConfirmed };
    console.log('Saving navigation history:', body);
    return this.http.post(environment.navigationHistories.storeNavigationHistory, body, { withCredentials: true }).pipe(
      tap(response => console.log('Navigation history saved:', response)),
      catchError(error => {
        console.error('Error saving navigation history:', error);
        return throwError(error);
      })
    );
  }

  storeRouteUsage(routeUsage: RouteUsage): Observable<RouteUsage> {
    if (!this.isLoggedIn) {
      console.log('User is not authenticated. Route usage will not be stored.');
      return throwError(() => new Error('User is not authenticated.'));
    }

    console.log('Storing route usage:', routeUsage);
    return this.http.post<RouteUsage>(environment.routeUsages.storeRouteUsage, routeUsage, { withCredentials: true }).pipe(
      tap(response => console.log('Route usage saved:', response)),
      catchError(error => {
        console.error('Error saving route usage:', error);
        return throwError(error);
      })
    );
  }
}