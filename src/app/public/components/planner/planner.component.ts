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
    if (this.authService.isAuthenticated) {
      this.isLoggedIn = true;
      this.fetchSavedRoutes();
    } else {
      this.authService.getIdentity().subscribe({
        next: (isAuthenticated) => {
          this.isLoggedIn = isAuthenticated;
          if (isAuthenticated) {
            this.fetchSavedRoutes();
          }
        },
        error: (error) => {
          console.error('Error fetching user identity:', error);
        }
      });
    }
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
    this.http.get<any[]>(environment.customRoutesUrl).subscribe({
      next: (routes) => {
        this.savedRoutes = routes;
      },
      error: (error) => {
        console.error('Error fetching routes:', error);
        toastr.error('Failed to fetch saved routes.');
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
      toastr.info('Departure time must be in the future!');
      this.arrivalTime = '';
      return;
    }

    this.routeData.distanceInKm = this.fareService.calculateDistance(this.routeData);

    const transportMode = google.maps.TravelMode.DRIVING; // or any other appropriate mode
    this.fareService.calculateDuration(this.routeData.start, this.routeData.end, transportMode, (duration, _) => {
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
      toastr.info('Please enter both departure time and date before saving.');
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

    this.http.post(environment.customRoutesUrl, routePayload).subscribe({
      next: (response) => {
        console.log('Route saved:', response);
        toastr.success('Route successfully saved.');
        this.fetchSavedRoutes();
        this.routeData = null;
      },
      error: (error) => {
        console.error('Error saving route:', error);
        toastr.error('Failed to save route.');
      }
    });
  }

  markRouteAsDone(routeId: string): void {
    if (!routeId) {
      toastr.error('Invalid route ID');
      return;
    }

    this.http.delete(`${environment.customRoutesUrl}/${routeId}`).subscribe({
      next: () => {
        toastr.success('Route deleted successfully.');
        this.fetchSavedRoutes();
      },
      error: (error) => {
        console.error('Error deleting route:', error);
        toastr.error('Failed to delete route. Please check your network and try again.');
      }
    });
  }

  resetRoute(): void {
    this.isRouteCompleted = false;
    toastr.info('Route has been reset!');
  }

  validateRoute(): void {
    const startWaypoint = this.routesService.findNearestStop(this.routeData.start);
    const endWaypoint = this.routesService.findNearestStop(this.routeData.end);

    if (!startWaypoint || !endWaypoint) {
      toastr.info('No nearby waypoints found for either origin or destination.');
      return;
    }

    const routes = this.routesService.findAllRoutePaths(startWaypoint, endWaypoint);
    if (routes.length === 0) {
      toastr.info('No route found for the adjusted details.');
    } else {
      toastr.info('Route is valid.');
    }
  }
}