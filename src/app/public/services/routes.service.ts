import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {

  // Route Data
  private jeepneyRoutes: any[] = [];
  private busRoutes: any[] = [];
  
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

  findRoutePath(
    startWaypoint: google.maps.LatLngLiteral,
    endWaypoint: google.maps.LatLngLiteral
): { path: google.maps.LatLngLiteral[]; color: string } {
    const routes = [...this.jeepneyRoutes, ...this.busRoutes];
    let bestPath: google.maps.LatLngLiteral[] = [];
    let bestColor = '';
    let minDistance = Infinity;

    routes.forEach(route => {
        let waypoints = route.waypoints.map(this.parseWaypoint);

        // Filter and prioritize extensions based on proximity
        const relevantExtensions = (route.extensions || [])
            .filter((extension: any) => {
                const extensionStartPoint = this.parseWaypoint(extension.startPoint);
                return (
                    this.isNearby(startWaypoint, extensionStartPoint) ||
                    this.isNearby(endWaypoint, extensionStartPoint) ||
                    extension.waypoints.some((extWaypoint: string) =>
                        this.isNearby(startWaypoint, this.parseWaypoint(extWaypoint)) ||
                        this.isNearby(endWaypoint, this.parseWaypoint(extWaypoint))
                    )
                );
            })
            .sort((a: any, b: any) => {
                const aDistance = this.calculateDistance(endWaypoint, this.parseWaypoint(a.startPoint));
                const bDistance = this.calculateDistance(endWaypoint, this.parseWaypoint(b.startPoint));
                return aDistance - bDistance;
            });

        // Process extensions bidirectionally
        let processedWaypoints = [...waypoints];

        relevantExtensions.forEach((extension: any) => {
            const extensionStartPoint = this.parseWaypoint(extension.startPoint);

            // Check if start is on the extension
            if (this.isNearby(startWaypoint, extensionStartPoint)) {
                processedWaypoints = [
                    ...extension.waypoints.map(this.parseWaypoint),
                    ...processedWaypoints
                ];
            }

            // Truncate the main route if end is on the extension
            const mainRouteCutoffIndex = processedWaypoints.findIndex(wp =>
                this.isNearby(wp, extensionStartPoint)
            );

            if (mainRouteCutoffIndex !== -1) {
                processedWaypoints = [
                    ...processedWaypoints.slice(0, mainRouteCutoffIndex + 1),
                    ...extension.waypoints.map(this.parseWaypoint),
                    ...processedWaypoints.slice(mainRouteCutoffIndex + 1)
                ];
            }
        });

        // Find shortest path between start and end waypoints
        const startIndex = processedWaypoints.findIndex(wp => this.isNearby(wp, startWaypoint));
        const endIndex = processedWaypoints.findIndex(wp => this.isNearby(wp, endWaypoint));

        if (startIndex !== -1 && endIndex !== -1) {
            const path = this.findShortestPath(processedWaypoints, startIndex, endIndex);
            const distance = this.calculatePathDistance(path);

            if (distance < minDistance) {
                minDistance = distance;
                bestPath = path;
                bestColor = route.color;
            }
        }
    });

    return { path: bestPath, color: bestColor };
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
    threshold = 0.05
  ): boolean {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(location.lat, location.lng),
      new google.maps.LatLng(waypoint.lat, waypoint.lng)
    );
    return distance <= threshold * 1000; // Convert threshold to meters
  }

  suggestMultimodalRoutes(
    start: google.maps.LatLngLiteral,
    end: google.maps.LatLngLiteral
  ): any[] {
    const suggestedRoutes: any[] = [];
    const nearestStartStop = this.findNearestStop(start);
    const nearestEndStop = this.findNearestStop(end);
  
    if (!nearestStartStop || !nearestEndStop) {
      console.warn('No nearby stops found for the given start or end location.');
      return [];
    }
  
    // Step 1: Find direct routes (Jeepney or Bus) from start to end
    [...this.jeepneyRoutes, ...this.busRoutes].forEach((route) => {
      const waypoints = route.waypoints.map(this.parseWaypoint);
      const startIndex = waypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, nearestStartStop));
      const endIndex = waypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, nearestEndStop));
  
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        suggestedRoutes.push({
          mode: route.type, // Jeepney or Bus
          color: route.color,
          waypoints: waypoints.slice(startIndex, endIndex + 1),
          distance: this.calculatePathDistance(waypoints.slice(startIndex, endIndex + 1))
        });
      }
    });
  
    // Step 2: Find multimodal routes (Jeepney + Bus)
    this.jeepneyRoutes.forEach((jeepneyRoute) => {
      const jeepneyWaypoints = jeepneyRoute.waypoints.map(this.parseWaypoint);
      const jeepneyStartIndex = jeepneyWaypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, nearestStartStop));
  
      if (jeepneyStartIndex !== -1) {
        this.busRoutes.forEach((busRoute) => {
          const busWaypoints = busRoute.waypoints.map(this.parseWaypoint);
          const jeepneyEndStop = jeepneyWaypoints[jeepneyStartIndex + 1]; // Next stop after start
          const busStartIndex = busWaypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, jeepneyEndStop));
          const busEndIndex = busWaypoints.findIndex((wp: google.maps.LatLngLiteral) => this.isNearby(wp, nearestEndStop));
  
          if (busStartIndex !== -1 && busEndIndex !== -1 && busStartIndex < busEndIndex) {
            suggestedRoutes.push({
              mode: 'Multimodal (Jeepney + Bus)',
              segments: [
                {
                  mode: 'Jeepney',
                  color: jeepneyRoute.color,
                  waypoints: jeepneyWaypoints.slice(jeepneyStartIndex)
                },
                {
                  mode: 'Bus',
                  color: busRoute.color,
                  waypoints: busWaypoints.slice(busStartIndex, busEndIndex + 1)
                }
              ],
              totalDistance:
                this.calculatePathDistance(jeepneyWaypoints.slice(jeepneyStartIndex)) +
                this.calculatePathDistance(busWaypoints.slice(busStartIndex, busEndIndex + 1))
            });
          }
        });
      }
    });
  
    return suggestedRoutes.sort((a, b) => a.totalDistance - b.totalDistance); // Sort by shortest distance
  }
  
}
