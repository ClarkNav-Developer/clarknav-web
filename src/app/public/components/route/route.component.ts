import { Component, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FloatingWindowService } from '../../../floating-window.service';
import { MapService } from '../../services/map/map.service';
import { RoutesService } from '../../services/routes/routes.service';
import { LocationService } from '../../services/geocoding/location.service';
import { SideNavService } from '../../services/side-nav/side-nav.service';
import { SuggestedRoutesService } from '../../services/routes/suggested-routes.service';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-route',
  templateUrl: './route.component.html',
  styleUrls: ['./route.component.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translate(-50%, -48%)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translate(-50%, -50%)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translate(-50%, -52%)' }))
      ])
    ])
  ]
})
export class RouteComponent implements OnInit, OnDestroy {
  showRouteList: boolean = true;
  showBackground: boolean = true;
  currentRouteId: string = '';
  currentRouteName: string = '';
  currentRouteType: string = '';
  routeInfo: string = '';
  isClosing: boolean = false;
  private routeCache: Map<string, any> = new Map();
  private routesLoadedSubscription!: Subscription;
  private routesLoaded: boolean = false;
  private routeInfoMap: { [key: string]: string } = {};

  constructor(
    public floatingWindowService: FloatingWindowService,
    private mapService: MapService,
    private routesService: RoutesService,
    private suggestedRoutesService: SuggestedRoutesService,
    private locationService: LocationService,
    private sideNavService: SideNavService,
    private renderer: Renderer2,
    private http: HttpClient
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

    // Fetch the route information from the JSON file
    this.http.get<{ [key: string]: string }>('/assets/route-info.json').subscribe(data => {
      this.routeInfoMap = data;
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
    return `route_${routeId}`;
  }

  private cacheRoute(routeId: string, route: any) {
    const key = this.getCacheKey(routeId);
    try {
      localStorage.setItem(key, JSON.stringify(route));
      this.routeCache.set(key, route);
    } catch (error) {
      console.error(`Error storing JSON in localStorage for key ${key}:`, error);
    }
  }

  private getCachedRoute(routeId: string): any | null {
    const key = this.getCacheKey(routeId);
    if (this.routeCache.has(key)) {
      return this.routeCache.get(key);
    }

    const cachedRoute = localStorage.getItem(key);
    if (cachedRoute) {
      try {
        const parsedRoute = JSON.parse(cachedRoute);
        this.routeCache.set(key, parsedRoute);
        return parsedRoute;
      } catch (error) {
        console.error(`Error parsing JSON from localStorage for key ${key}:`, error);
        localStorage.removeItem(key); // Remove invalid JSON data from localStorage
        return null;
      }
    }
    return null;
  }

  private loadCache() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('route_')) {
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

    this.currentRouteId = routeId; // Update the current route ID
    this.currentRouteName = route.routeName; // Update the current route name
    this.currentRouteType = routeId.startsWith('J') ? 'Jeepney' : routeId.startsWith('B') ? 'Bus' : 'Taxi'; // Determine the route type
    this.showRouteList = false; // Hide the route list
    this.showBackground = false; // Hide the background

    // Add class to move the floating window to the bottom
    const floatingWindow = document.querySelector('.floating-window');
    if (floatingWindow) {
      this.renderer.addClass(floatingWindow, 'bottom-position');
    }
  }

  renderRoute1() {
    this.renderRoute('J1');
    this.sideNavService.hideSideNav(); // Hide side-nav-mobile
  }

  renderRoute2() {
    this.renderRoute('J2');
    this.sideNavService.hideSideNav(); // Hide side-nav-mobile
  }

  renderRoute3() {
    this.renderRoute('J3');
    this.sideNavService.hideSideNav(); // Hide side-nav-mobile
  }

  renderRoute5() {
    this.renderRoute('J5');
    this.sideNavService.hideSideNav(); // Hide side-nav-mobile
  }

  renderRoute6() {
    this.renderRoute('J6');
    this.sideNavService.hideSideNav(); // Hide side-nav-mobile
  }

  renderRoute7() {
    this.renderRoute('B1');
    this.sideNavService.hideSideNav(); // Hide side-nav-mobile
  }

  renderRoute8() {
    this.renderRoute('B2');
    this.sideNavService.hideSideNav(); // Hide side-nav-mobile
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

    this.sideNavService.showSideNav(); // Show side-nav-mobile
  }

  private routeInfoHtmlMap: { [key: string]: string } = {
    'J1': `
        <img class="jeep-image" src="public/Jeep-Loop-Icon/Jeepney-Route-1-Green.svg" alt="Jeepney Route 1" style="width: 100%; height: auto;">
        <br>
        <p><strong>Jeepney Route 1</strong><br>
        Bayanihan Terminal - Clark Freeport Zone Vice Versa - Mt. Pinatubo Co</p>
        <br>
        <p><strong>Places to visit in this route:</strong></p>
        <p>Air Force City Park <br> 
        Hann Casino Resort <br> 
        Midori Hotel and Casino <br> 
        Clark Safari and Adventure Park <br> 
        Clark Aqua Planet <br> 
        Deco Central Showroom <br> 
        Nayong Pilipino <br> 
        Fontana Casino <br> 
        Fontana Water Park </p>
      `,
    'J2': `
        <img src="public/Jeep-Loop-Icon/Jeepney-Route-2-Beige.svg" alt="Jeepney Route 2" style="width: 100%; height: auto;">
        <br>
        <p><strong>Jeepney Route 2</strong><br>
        Bayanihan Terminal - Clark Hostel</p>
        <br>
        <p><strong>Places to visit in this route:</strong></p>
        <p>Bicentennial Park <br> 
        Children's Playground <br> 
        Clark Parade Grounds <br> 
        Clark Museum <br> 
        Royce Hotel & Casino <br> 
        Fontana Casino <br> 
        Fontana Water Park</p>
      `,
    'J3': `
        <img src="public/Jeep-Loop-Icon/Jeepney-Route-3-Blue.svg" alt="Jeepney Route 3" style="width: 100%; height: auto;">
        <br>
        <p><strong>Jeepney Route 3</strong><br>
        Bayanihan Terminal - Picnic Ground - CFZ Vice Versa</p>
        <br>
        <p><strong>Places to visit in this route:</strong></p>
        <p>Air Force City <br> 
        Royce Hotel & Casino <br> 
        Widus Hotel & Casino <br> 
        Midori Hotel & Casino <br> 
        El Kabayo <br> 
        Clark International Speedway</p>
      `,
    'J5': `
        <img src="public/Jeep-Loop-Icon/Jeepney-Route-5-Red.svg" alt="Jeepney Route 5" style="width: 100%; height: auto;">
        <br>
        <p><strong>Jeepney Route 5</strong><br>
        Bayanihan Terminal - IE-5 - GGLC Vice Versa</p>
        <br>
        <p><strong>Places to visit in this route:</strong></p>
        <p>The Medical City Clark</p>
      `,
    'J6': `
        <img src="public/Jeep-Loop-Icon/Jeepney-Route-5-Yellow.svg" alt="Jeepney Route 6" style="width: 100%; height: auto;">
        <br>
        <p><strong>Jeepney Route 6</strong><br>
        Mabalacat Public Market Terminal - PhilExcel Vice Versa</p>
        <br>
        <p><strong>Places to visit in this route:</strong></p>
        <p>Dinosaur Island <br> 
        El Kabayo <br> 
        Hann Casino & Resort <br> 
        Widus Hotel & Casino <br> 
        Clark Museum <br> 
        Clark Parade Grounds <br> 
        Children's Playground <br> 
        Bicentennial Park</p>
      `,
    'B1': `
        <img src="public/Jeep-Loop-Icon/Clark-Loop-Northbound.svg" alt="Clark Loop Northbound" style="width: 100%; height: auto;">
        <br>
        <p><strong>Clark Loop Northbound</strong><br>
        Bayanihan Terminal - Clark International Airport</p>
        <br>
        <p><strong>Places to visit in this route:</strong></p>
        <p>Bicentennial Park <br> 
        Children's Playground <br> 
        Clark Parade Grounds <br> 
        Clark Museum <br> 
        Royce Hotel & Casino <br> 
        Widus Hotel & Casino <br> 
        Hann Casino & Resort <br> 
        El Kabayo <br> 
        Dinosaur Island <br> 
        Clark International Airport</p>
      `,
    'B2': `
        <img src="public/Jeep-Loop-Icon/Clark-Loop-Southbound.svg" alt="Clark Loop Southbound" style="width: 100%; height: auto;">
        <br>
        <p><strong>Clark Loop Southbound</strong><br>
        Clark International Airport - Bayanihan Terminal</p>
        <br>
        <p><strong>Places to visit in this route:</strong></p>
        <p>Bicentennial Park <br> 
        Children's Playground <br> 
        Clark Parade Grounds <br> 
        Clark Museum <br> 
        Royce Hotel & Casino <br> 
        Widus Hotel & Casino <br> 
        Hann Casino & Resort <br> 
        El Kabayo <br> 
        Dinosaur Island <br> 
        Clark International Airport</p>
      `
  };

  showRouteInfo() {
    const routeInfo = this.routeInfoHtmlMap[this.currentRouteId];

    if (routeInfo) {
      this.routeInfo = routeInfo;
      // Optionally add analytics tracking
      console.debug(`Info displayed for route ${this.currentRouteId}`);
    } else {
      this.routeInfo = '<p class="no-info">No information available for this route.</p>';
    }
  }

  closeRouteInfo() {
    this.isClosing = true;

    // Wait for the animation to complete before clearing the content
    setTimeout(() => {
      this.routeInfo = '';
      this.isClosing = false;
    }, 300); // Same duration as your animation (0.3s = 300ms)
  }
}