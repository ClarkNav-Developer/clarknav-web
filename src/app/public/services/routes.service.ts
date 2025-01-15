import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {

  // Route Data
  jeepneyRoutes: any[] = [];
  busRoutes: any[] = [];

  constructor(private http: HttpClient) { }

  loadRoutes() {
    console.log('Loading routes from JSON...');
    this.http.get('assets/routes.json').subscribe(
      (data: any) => {
        console.log('Routes loaded:', data);
        this.jeepneyRoutes = data.routes.jeepney;
        this.busRoutes = data.routes.bus;
        // this.displayAllJeepneyWaypoints();
      },
      (error) => {
        console.error('Error loading routes:', error);
      }
    );
  }

  parseWaypoint(waypoint: string): google.maps.LatLngLiteral {
    const [lat, lng] = waypoint.split(',').map(coord => parseFloat(coord.trim()));
    return { lat, lng };
  }

  getRouteById(routeId: string) {
    return [...this.jeepneyRoutes, ...this.busRoutes].find(route => route.routeId === routeId);
  }

  findNearestStop(location: google.maps.LatLngLiteral): google.maps.LatLngLiteral | null {
    let nearestWaypoint = null;
    let minDistance = Infinity;

    // Include extension waypoints
    this.jeepneyRoutes.forEach(route => {
      route.extensions?.forEach((extension: any) => {
        extension.waypoints.map(this.parseWaypoint).forEach((extensionWaypoint: google.maps.LatLngLiteral) => {
          const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(location.lat, location.lng),
            new google.maps.LatLng(extensionWaypoint.lat, extensionWaypoint.lng)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestWaypoint = extensionWaypoint;
          }
        });
      });
    });

    // Include main route waypoints
    const allWaypoints = [...this.jeepneyRoutes, ...this.busRoutes]
      .flatMap(route => route.waypoints)
      .map(this.parseWaypoint);

    allWaypoints.forEach(waypoint => {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(location.lat, location.lng),
        new google.maps.LatLng(waypoint.lat, waypoint.lng)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestWaypoint = waypoint;
      }
    });

    return nearestWaypoint;
  }

  findAllRoutePaths(
    startWaypoint: google.maps.LatLngLiteral,
    endWaypoint: google.maps.LatLngLiteral
  ): { path: google.maps.LatLngLiteral[]; color: string }[] {
    const routes = [...this.jeepneyRoutes, ...this.busRoutes];
    const allPaths: { path: google.maps.LatLngLiteral[]; color: string }[] = [];

    routes.forEach(route => {
      let waypoints = route.waypoints.map(this.parseWaypoint);

      // Include extensions using truncate and bidirectional logic
      const relevantExtensions = (route.extensions || [])
        .filter((extension: any) => this.isRelevantExtension(extension, startWaypoint, endWaypoint))
        .map((extension: any) => extension.waypoints.map(this.parseWaypoint));

      let processedWaypoints = [...waypoints];
      relevantExtensions.forEach((extensionWaypoints: google.maps.LatLngLiteral[]) => {
        processedWaypoints = this.truncateAndIntegrateRoute(processedWaypoints, extensionWaypoints);
      });

      // Find paths between start and end points
      const startIndex = processedWaypoints.findIndex(wp => this.isNearby(wp, startWaypoint));
      const endIndex = processedWaypoints.findIndex(wp => this.isNearby(wp, endWaypoint));

      if (startIndex !== -1 && endIndex !== -1) {
        const path = this.findShortestPath(processedWaypoints, startIndex, endIndex);
        allPaths.push({ path, color: route.color });
      }
    });

    return allPaths;
  }

  private truncateAndIntegrateRoute(
    mainWaypoints: google.maps.LatLngLiteral[],
    extensionWaypoints: google.maps.LatLngLiteral[]
  ): google.maps.LatLngLiteral[] {
    const extensionStart = extensionWaypoints[0];
    const mainRouteIndex = mainWaypoints.findIndex(wp => this.isNearby(wp, extensionStart));

    if (mainRouteIndex !== -1) {
      return [
        ...mainWaypoints.slice(0, mainRouteIndex + 1),
        ...extensionWaypoints,
        ...mainWaypoints.slice(mainRouteIndex + 1),
      ];
    }

    return [...mainWaypoints, ...extensionWaypoints];
  }

  private isRelevantExtension(extension: any, startWaypoint: google.maps.LatLngLiteral, endWaypoint: google.maps.LatLngLiteral): boolean {
    const extensionStartPoint = this.parseWaypoint(extension.startPoint);
    return (
      this.isNearby(startWaypoint, extensionStartPoint) ||
      this.isNearby(endWaypoint, extensionStartPoint) ||
      extension.waypoints.some((extWaypoint: string) =>
        this.isNearby(this.parseWaypoint(extWaypoint), startWaypoint) ||
        this.isNearby(this.parseWaypoint(extWaypoint), endWaypoint)
      )
    );
  }



  calculateDistance(pointA: google.maps.LatLngLiteral, pointB: google.maps.LatLngLiteral): number {
    return google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(pointA.lat, pointA.lng),
      new google.maps.LatLng(pointB.lat, pointB.lng)
    );
  }

  private findShortestPath(
    waypoints: google.maps.LatLngLiteral[],
    startIndex: number,
    endIndex: number
  ): google.maps.LatLngLiteral[] {
    if (startIndex <= endIndex) {
      return waypoints.slice(startIndex, endIndex + 1);
    } else {
      return waypoints.slice(endIndex, startIndex + 1).reverse();
    }
  }

  private calculatePathDistance(path: google.maps.LatLngLiteral[]): number {
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      distance += google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(path[i].lat, path[i].lng),
        new google.maps.LatLng(path[i + 1].lat, path[i + 1].lng)
      );
    }
    return distance;
  }

  isNearby(
    location: google.maps.LatLngLiteral,
    waypoint: google.maps.LatLngLiteral,
    threshold = 0.09 // Increase the threshold to 1.0 (1000 meters)
  ): boolean {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(location.lat, location.lng),
      new google.maps.LatLng(waypoint.lat, waypoint.lng)
    );
    return distance <= threshold * 1000; // Convert threshold to meters
  }

}
