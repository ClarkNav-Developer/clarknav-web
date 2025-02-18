import { Component, OnInit } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';
import { ActivatedRoute } from '@angular/router';
import { RoutesService } from '../../services/routes/routes.service';
import { GeocodingService } from '../../services/geocoding/geocoding.service';
import { FareService } from '../../services/fare/fare.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-planner',
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.css']
})
export class PlannerComponent implements OnInit {
  routeData: any = null;
  originAddress: string = 'Loading...';
  destinationAddress: string = 'Loading...';
  arrivalTime: string = '';
  departureDate: string = ''; // Stores selected date
  isRouteCompleted: boolean = false; // Tracks if route is marked as done
  isLoggedIn: boolean = false;
  savedRoutes: any[] = [];  // To store fetched routes

  constructor(
    private floatingWindowService: FloatingWindowService,
    private routesService: RoutesService,
    private activatedRoute: ActivatedRoute,
    private geocodingService: GeocodingService,
    private fareService: FareService,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }

  ngOnInit(): void {
    this.checkAuthentication();
    this.activatedRoute.data.subscribe((data: any) => {
      if (history.state.route && this.routeData === null) {
        this.routeData = history.state.route;
        this.geocodeAddresses();

        setTimeout(() => {
          history.replaceState({}, '');
        }, 0);
      }
    });
  }

  private checkAuthentication(): void {
    this.authService.isAuthenticated.subscribe(isAuthenticated => {
      console.log('Is Authenticated:', isAuthenticated); // Debugging: Check authentication state
      this.isLoggedIn = isAuthenticated;
      if (isAuthenticated) {
        this.fetchSavedRoutes();
      }
    });
  }

  private geocodeAddresses(): void {
    if (this.routeData) {
      this.geocodingService.geocodeLatLng(this.routeData.start, (address: string) => {
        this.originAddress = address;
      });

      this.geocodingService.geocodeLatLng(this.routeData.end, (address: string) => {
        this.destinationAddress = address;
      });
    }
  }

  private fetchSavedRoutes(): void {
    if (!this.isLoggedIn) {
      return;
    }

    this.http.get<any[]>(environment.customRoutes.getCustomRoutes, { withCredentials: true }).subscribe({
      next: (routes) => {
        this.savedRoutes = routes;
      },
      error: (error) => {
        console.error('Error fetching routes:', error);
        alert('Failed to fetch saved routes.');
      }
    });
  }

  calculateFareAndDuration(): void {
    if (!this.routeData || !this.routeData.departureTime || !this.routeData.departureDate) {
      this.arrivalTime = '';
      return;
    }

    const selectedDateTime = new Date(`${this.routeData.departureDate}T${this.routeData.departureTime}`);

    if (selectedDateTime < new Date()) {
      alert('Departure time must be in the future!');
      this.arrivalTime = '';
      return;
    }

    this.routeData.distanceInKm = this.fareService.calculateDistance(this.routeData);

    this.fareService.calculateDuration(this.routeData.start, this.routeData.end, (duration, _) => {
      this.routeData.duration = duration;

      let durationMinutes = 0;
      const durationParts = duration.match(/\d+/g) || [];
      if (duration.includes('hour')) {
        if (durationParts[0]) durationMinutes += parseInt(durationParts[0]) * 60;
        if (durationParts[1]) durationMinutes += parseInt(durationParts[1]);
      } else {
        if (durationParts[0]) durationMinutes += parseInt(durationParts[0]);
      }

      const arrivalDateTime = new Date(selectedDateTime.getTime() + durationMinutes * 60000);

      this.arrivalTime = arrivalDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    });

    this.fareService.calculateFare(this.routeData);
  }

  closeRouteData(): void {
    this.routeData = null;
    this.router.navigateByUrl('/planner', { state: {} });
  }

  saveRouteToDatabase(): void {
    if (!this.routeData.departureTime || !this.routeData.departureDate) {
      alert('Please enter both departure time and date before saving.');
      return;
    }

    const routePayload = {
      origin: this.originAddress,
      destination: this.destinationAddress,
      route_name: this.routeData?.name || 'Custom Route',
      fare: this.routeData?.fare || 0,
      student_fare: this.routeData?.studentFare || null,
      duration: this.routeData?.duration || '',
      departure_time: this.routeData.departureTime,
      arrival_time: this.arrivalTime,
      departure_date: this.routeData.departureDate,
    };

    this.http.post(environment.customRoutes.storeCustomRoute, routePayload, { withCredentials: true }).subscribe({
      next: (response) => {
        console.log('Route saved:', response);
        alert('Route successfully saved.');
        this.fetchSavedRoutes();
        this.routeData = null;
      },
      error: (error) => {
        console.error('Error saving route:', error);
        alert('Failed to save route.');
      }
    });
  }

  markRouteAsDone(routeId: string): void {
    if (!routeId) {
      alert('Invalid route ID');
      return;
    }

    this.http.delete(`${environment.customRoutes.deleteCustomRoute}`, { withCredentials: true }).subscribe({
      next: () => {
        alert('Route deleted successfully.');
        this.fetchSavedRoutes();
      },
      error: (error) => {
        console.error('Error deleting route:', error);
        alert('Failed to delete route. Please check your network and try again.');
      }
    });
  }

  resetRoute(): void {
    this.isRouteCompleted = false;
    alert('Route has been reset!');
  }

  validateRoute(): void {
    const startWaypoint = this.routesService.findNearestStop(this.routeData.start);
    const endWaypoint = this.routesService.findNearestStop(this.routeData.end);

    if (!startWaypoint || !endWaypoint) {
      alert('No nearby waypoints found for either origin or destination.');
      return;
    }

    const routes = this.routesService.findAllRoutePaths(startWaypoint, endWaypoint);
    if (routes.length === 0) {
      alert('No route found for the adjusted details.');
    } else {
      alert('Route is valid.');
    }
  }
}