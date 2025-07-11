import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RouteUsage } from '../../../models/routeusage';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {

  // ================================
  // Data Storage
  // ================================

  // Route Data
  jeepneyRoutes: any[] = [];
  busRoutes: any[] = [];
  taxiRoutes: any[] = [];

  //checking for routes version
  private readonly routesUrl = 'assets/routes.json';
  private readonly cacheKey = 'routes';
  private readonly versionKey = 'routesVersion';
  private routesLoadedSubject = new BehaviorSubject<boolean>(false);
  private routesLoaded = false; // Add a flag to track if routes are already loaded

  constructor(private http: HttpClient) {}

  // ================================
  // Route Loading Methods
  // ================================

  /**
   * Load route data from a JSON file.
   */

  get routesLoaded$(): Observable<boolean> {
    return this.routesLoadedSubject.asObservable();
  }

  loadRoutes() {

    if (this.routesLoaded) {
      return; // If routes are already loaded, do nothing
    }

    const cachedVersion = localStorage.getItem(this.versionKey);
    const cachedRoutes = localStorage.getItem(this.cacheKey);
  
    this.http.get<any>(this.routesUrl).subscribe(data => {
      const serverVersion = data.version;

      if (cachedVersion !== serverVersion || !cachedRoutes) {
        this.jeepneyRoutes = data.routes.jeepney || [];
        this.busRoutes = data.routes.bus || [];
        this.taxiRoutes = data.routes.taxi || []; // Load taxi routes
        localStorage.setItem(this.cacheKey, JSON.stringify(data));
        localStorage.setItem(this.versionKey, serverVersion);
        console.debug('Routes loaded from server:', data);
      } else {
        const cachedData = JSON.parse(cachedRoutes);
        if (cachedData.version === serverVersion) {
          this.jeepneyRoutes = cachedData.routes.jeepney || [];
          this.busRoutes = cachedData.routes.bus || [];
          this.taxiRoutes = cachedData.routes.taxi || []; // Load taxi routes
          console.debug('Routes loaded from cache:', cachedData);
        } else {
          this.jeepneyRoutes = data.routes.jeepney || [];
          this.busRoutes = data.routes.bus || [];
          this.taxiRoutes = data.routes.taxi || []; // Load taxi routes
          localStorage.setItem(this.cacheKey, JSON.stringify(data));
          localStorage.setItem(this.versionKey, serverVersion);
          console.debug('Routes loaded from server:', data);
        }
      }
      this.routesLoadedSubject.next(true); // Notify that routes are loaded
    });
  }

  // ================================
  // Route Retrieval and Parsing Methods
  // ================================

  /**
   * Parse a waypoint string into a LatLngLiteral object.
   */
  parseWaypoint(waypoint: string): google.maps.LatLngLiteral {
    const [lat, lng] = waypoint.split(',').map(coord => parseFloat(coord.trim()));
    return { lat, lng };
  }

  /**
   * Get a route by its unique ID.
   */
  getRouteById(routeId: string) {
    if (routeId === 'taxi') {
      return { routeId: 'taxi', routeName: 'Taxi', type: 'Taxi' };
    }

    const allRoutes = [...this.jeepneyRoutes, ...this.busRoutes, ...this.taxiRoutes]; // Include taxi routes
    const route = allRoutes.find(route => route.routeId === routeId);

    // Log route details for debugging
    console.debug('Route by ID:', routeId, route);

    return route;
  }
  // ================================
  // Nearest Stop and Pathfinding Methods
  // ================================

  /**
   * Find the nearest stop to a given location.
   */
  findNearestStop(location: google.maps.LatLngLiteral): google.maps.LatLngLiteral | null {
    let nearestWaypoint = null;
    let minDistance = Infinity;

    this.jeepneyRoutes.forEach(route => {
      route.extensions?.forEach((extension: any) => {
        extension.waypoints.map(this.parseWaypoint).forEach((extensionWaypoint: google.maps.LatLngLiteral) => {
          const distance = this.calculateDistance(location, extensionWaypoint);
          if (distance < minDistance) {
            minDistance = distance;
            nearestWaypoint = extensionWaypoint;
          }
        });
      });
    });

    const allWaypoints = [...this.jeepneyRoutes, ...this.busRoutes]
      .flatMap(route => route.waypoints)
      .map(this.parseWaypoint);

    allWaypoints.forEach(waypoint => {
      const distance = this.calculateDistance(location, waypoint);
      if (distance < minDistance) {
        minDistance = distance;
        nearestWaypoint = waypoint;
      }
    });

    return nearestWaypoint;
  }

  /**
   * Find all possible route paths between two waypoints.
   */
  findAllRoutePaths(
    startWaypoint: google.maps.LatLngLiteral,
    endWaypoint: google.maps.LatLngLiteral
  ): { path: google.maps.LatLngLiteral[]; color: string; routeId: string }[] {
    const routes = [...this.jeepneyRoutes, ...this.busRoutes];
    const allPaths: { path: google.maps.LatLngLiteral[]; color: string; routeId: string }[] = [];
  
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
        allPaths.push({ path, color: route.color, routeId: route.routeId });
      }
    });
  
    return allPaths;
  }

  // ================================
  // Helper Methods
  // ================================

  /**
   * Truncate and integrate route extensions into the main waypoints.
   */
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

  /**
   * Determine if an extension is relevant based on its waypoints.
   */
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

  /**
   * Calculate the distance between two points.
   */
  calculateDistance(pointA: google.maps.LatLngLiteral, pointB: google.maps.LatLngLiteral): number {
    return google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(pointA.lat, pointA.lng),
      new google.maps.LatLng(pointB.lat, pointB.lng)
    );
  }

  /**
   * Find the shortest path between two indices in an array of waypoints.
   */
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

  /**
   * Check if a waypoint is nearby a location within a threshold.
   */
  isNearby(
    location: google.maps.LatLngLiteral,
    waypoint: google.maps.LatLngLiteral,
    threshold = 0.09
  ): boolean {
    const distance = this.calculateDistance(location, waypoint);
    return distance <= threshold * 1000; // Convert threshold to meters
  }

  /**
 * Batch waypoints into groups of 25 or fewer.
 */
  batchWaypoints(waypoints: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral[][] {
    const batches: google.maps.LatLngLiteral[][] = [];
    for (let i = 0; i < waypoints.length; i += 25) {
      batches.push(waypoints.slice(i, i + 25));
    }
    return batches;
  }

  getRouteUsages(): Observable<RouteUsage[]> {
    return this.http.get<RouteUsage[]>(environment.routeUsagesUrl);
  }
}
