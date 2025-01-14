import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SuggestedRoutesService {
  constructor(private http: HttpClient) {}

  getSuggestedRoutes(): Observable<any> {
    return this.http.get('assets/routes.json');
  }

  getAllPossibleRoutes(): Observable<any[]> {
    return this.http.get('assets/routes.json').pipe(
      map((data: any) => {
        const transformRoute = (route: any) => ({
          ...route,
          startLocation: route.waypoints[0],
          endLocation: route.waypoints[route.waypoints.length - 1],
          estimatedFare: this.calculateFare(route.waypoints.length),
          duration: this.calculateDuration(route.waypoints.length)
        });

        const jeepneyRoutes = data.routes.jeepney.filter((route: any) => route.routeId.startsWith('J')).map(transformRoute);
        const busRoutes = data.routes.bus.filter((route: any) => route.routeId.startsWith('B')).map(transformRoute);
        return [...jeepneyRoutes, ...busRoutes];
      })
    );
  }

  getRoutesForDestination(destination: google.maps.LatLngLiteral): Observable<any[]> {
    return this.getAllPossibleRoutes().pipe(
      map((routes: any[]) => {
        console.log('All possible routes:', routes); // Debugging statement
        const filteredRoutes = routes.filter(route => 
          route.waypoints.some((waypoint: string) => {
            const [lat, lng] = waypoint.split(',').map(coord => parseFloat(coord.trim()));
            const isNearby = this.isNearby({ lat, lng }, destination);
            console.log(`Waypoint: ${lat}, ${lng} | Destination: ${destination.lat}, ${destination.lng} | isNearby: ${isNearby}`); // Debugging statement
            return isNearby;
          })
        );
        console.log('Filtered routes:', filteredRoutes); // Debugging statement
        return filteredRoutes;
      })
    );
  }

  private calculateFare(waypointsCount: number): number {
    return waypointsCount * 2; // Example fare calculation
  }

  private calculateDuration(waypointsCount: number): number {
    return waypointsCount * 2; // Example duration calculation in minutes
  }

  private isNearby(pointA: google.maps.LatLngLiteral, pointB: google.maps.LatLngLiteral, threshold = 0.09): boolean {
    const distance = Math.sqrt(Math.pow(pointA.lat - pointB.lat, 2) + Math.pow(pointA.lng - pointB.lng, 2));
    console.log(`Distance between points: ${distance} | Threshold: ${threshold}`); // Debugging statement
    return distance <= threshold;
  }
}