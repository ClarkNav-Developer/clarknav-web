import { Component, OnInit } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';
import { ActivatedRoute } from '@angular/router';
import { RoutesService } from '../../services/routes/routes.service';
import { GeocodingService } from '../../services/geocoding/geocoding.service';
import { FareService } from '../../services/fare/fare.service';

@Component({
  selector: 'app-planner',
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.css']
})
export class PlannerComponent implements OnInit {
  routeData: any;
  originAddress: string = 'Loading...';
  destinationAddress: string = 'Loading...';
  arrivalTime: string = '';
  departureDate: string = ''; // Stores selected date
  isRouteCompleted: boolean = false; // Tracks if route is marked as done

  constructor(
    private floatingWindowService: FloatingWindowService,
    private routesService: RoutesService,
    private activatedRoute: ActivatedRoute,
    private geocodingService: GeocodingService,
    private fareService: FareService
  ) {}

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }

  ngOnInit(): void {
    this.activatedRoute.data.subscribe((data: any) => {
      this.routeData = history.state.route;
      if (this.routeData) {
        this.geocodingService.geocodeLatLng(this.routeData.start, (address: string) => {
          this.originAddress = address;
        });

        this.geocodingService.geocodeLatLng(this.routeData.end, (address: string) => {
          this.destinationAddress = address;
        });
      }
    });
  }

  calculateFareAndDuration(): void {
    if (this.routeData && this.routeData.departureTime && this.departureDate) {
      const now = new Date();
      const selectedDateTime = new Date(`${this.departureDate}T${this.routeData.departureTime}`);

      if (selectedDateTime < now) {
        alert('Departure time must be in the future!');
        this.arrivalTime = '';
        return;
      }

      this.routeData.distanceInKm = this.fareService.calculateDistance(this.routeData);

      this.fareService.calculateDuration(this.routeData.start, this.routeData.end, (duration, _) => {
        this.routeData.duration = duration;

        const durationParts = duration.match(/\d+/g) || [];
        let durationMinutes = 0;
        if (duration.includes('hour')) {
          if (durationParts[0]) {
            durationMinutes += parseInt(durationParts[0]) * 60;
          }
          if (durationParts[1]) durationMinutes += parseInt(durationParts[1]);
        } else {
          if (durationParts[0]) {
            durationMinutes += parseInt(durationParts[0]);
          }
        }

        const arrivalDateTime = new Date(selectedDateTime.getTime() + durationMinutes * 60000);
        this.arrivalTime = arrivalDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });

      this.fareService.calculateFare(this.routeData);
    } else {
      this.arrivalTime = '';
    }
  }

  markRouteAsDone(): void {
    this.isRouteCompleted = true;
    alert('Route marked as done!');
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
