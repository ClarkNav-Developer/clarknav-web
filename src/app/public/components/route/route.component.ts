import { Component, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';
import { MapService } from '../../services/map/map.service';
import { RoutesService } from '../../services/routes/routes.service';
import { LocationService } from '../../services/geocoding/location.service';
import { SuggestedRoutesService } from '../../services/routes/suggested-routes.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-route',
  templateUrl: './route.component.html',
  styleUrl: './route.component.css'
})
export class RouteComponent implements OnInit, OnDestroy {
  showRouteList: boolean = true;
  showBackground: boolean = true;
  currentRouteName: string = '';
  currentRouteType: string = '';
  private routeCache: Map<string, any> = new Map();
  private routesLoadedSubscription!: Subscription;
  private routesLoaded: boolean = false;

  constructor(
    public floatingWindowService: FloatingWindowService,
    private mapService: MapService,
    private routesService: RoutesService,
    private suggestedRoutesService: SuggestedRoutesService,
    private locationService: LocationService,
    private renderer: Renderer2
  ) {
    this.loadCache();
  }

  ngOnInit(): void {
    this.routesLoadedSubscription = this.routesService.routesLoaded$.subscribe(loaded => {
      this.routesLoaded = loaded;
      if (loaded) {
        // Routes are loaded, you can now render routes
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routesLoadedSubscription) {
      this.routesLoadedSubscription.unsubscribe();
    }
  }

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }

  private getCacheKey(routeId: string): string {
    return routeId;
  }

  private cacheRoute(routeId: string, route: any) {
    const key = this.getCacheKey(routeId);
    try {
      localStorage.setItem(key, JSON.stringify(route));
    } catch (error) {
      console.error(`Error storing JSON in localStorage for key ${key}:`, error);
    }
  }

  private getCachedRoute(routeId: string): any | null {
    const key = this.getCacheKey(routeId);
    const cachedRoute = localStorage.getItem(key);
    if (cachedRoute) {
      try {
        return JSON.parse(cachedRoute);
      } catch (error) {
        console.error(`Error parsing JSON from localStorage for key ${key}:`, error);
        localStorage.removeItem(key); // Remove invalid JSON data from localStorage
        return null;
      }
    }
    return null;
  }

  private loadCache() {
    // Load any existing cache from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== 'routesVersion' && key !== 'authToken') { // Skip non-route keys
        try {
          const cachedRoute = localStorage.getItem(key);
          if (cachedRoute) {
            this.routeCache.set(key, JSON.parse(cachedRoute));
          }
        } catch (error) {
          console.error(`Error parsing JSON from localStorage for key ${key}:`, error);
          localStorage.removeItem(key); // Remove invalid JSON data from localStorage
        }
      }
    }
  }

  renderRoute(routeId: string) {
    if (!this.routesLoaded) {
      console.error('Routes not loaded yet');
      return;
    }

    const cachedRoute = this.getCachedRoute(routeId);
    if (cachedRoute) {
      this.displayRoute(cachedRoute, routeId, false);
      return;
    }
  
    const route = this.routesService.getRouteById(routeId);
    if (route) {
      this.cacheRoute(routeId, route);
      this.displayRoute(route, routeId, false);
    } else {
      console.error(`Route ${routeId} not found`);
    }
  }

  private displayRoute(route: any, routeId: string, saveHistory: boolean = true) {
    const mainWaypoints = route.waypoints.map(this.routesService.parseWaypoint);
    const routeColor = route.color;
    this.mapService.displayRouteSegments({ path: mainWaypoints, color: routeColor });

    // Display extension routes
    route.extensions?.forEach((extension: any) => {
      const extensionWaypoints = extension.waypoints.map(this.routesService.parseWaypoint);
      this.mapService.displayRouteSegments({ path: extensionWaypoints, color: routeColor });
    });

    this.currentRouteName = route.routeName; // Update the current route name
    this.currentRouteType = routeId.startsWith('J') ? 'Jeepney' : 'Bus'; // Determine the route type
    this.showRouteList = false; // Hide the route list
    this.showBackground = false; // Hide the background

    // Add class to move the floating window to the bottom
    const floatingWindow = document.querySelector('.floating-window');
    if (floatingWindow) {
      this.renderer.addClass(floatingWindow, 'bottom-position');
    }

    // Save navigation history if both currentLocation and destination are set and saveHistory is true
    if (saveHistory && this.locationService.currentLocationAddress && this.locationService.destinationAddress &&
        this.locationService.currentLocationAddress !== 'Current location not set' &&
        this.locationService.destinationAddress !== 'Destination not set') {
      this.suggestedRoutesService.saveNavigationHistory(
        this.locationService.currentLocationAddress,
        this.locationService.destinationAddress,
        { path: mainWaypoints, color: routeColor },
        true
      ).subscribe(response => {
        console.log('Navigation history saved:', response);
      }, error => {
        console.error('Error saving navigation history:', error);
      });
    }
  }

  renderRoute1() {
    this.renderRoute('J1');
  }

  renderRoute2() {
    this.renderRoute('J2');
  }

  renderRoute3() {
    this.renderRoute('J3');
  }

  renderRoute5() {
    this.renderRoute('J5');
  }

  renderRoute6() {
    this.renderRoute('J6');
  }

  renderRoute7() {
    this.renderRoute('B1');
  }

  renderRoute8() {
    this.renderRoute('B2');
  }

  showRouteListAgain() {
    this.mapService.clearMap(); // Clear the rendered route
    this.mapService.clearMarkers(); // Clear the map markers
    this.showRouteList = true;
    this.showBackground = true; // Show the background
    this.currentRouteName = ''; // Clear the current route name
    this.currentRouteType = ''; // Clear the current route type
  
    // Remove class to move the floating window back to the center
    const floatingWindow = document.querySelector('.floating-window');
    if (floatingWindow) {
      this.renderer.removeClass(floatingWindow, 'bottom-position');
    }
  }
}