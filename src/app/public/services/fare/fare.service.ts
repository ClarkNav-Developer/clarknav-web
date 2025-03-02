import { Injectable } from '@angular/core';
import { WebsocketService } from '../websocket/websocket.service';
import { of } from 'rxjs';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class FareService {
  constructor(private websocketService: WebsocketService) {
    this.initializeFareConfig();
  }

  // Add these to your FareService
  private _fareConfig = {
    jeepney: { baseFare: 13, additionalFare: 1.80 },
    bus: { baseFare: 15, additionalFare: 2.65 },
    taxi: { baseFare: 40, additionalFare: 13.50 }
  };

  getFareConfig() {
    return this._fareConfig;
  }

  updateFareConfig(fareConfig: any) {
    // Update the internal configuration
    this._fareConfig = { ...fareConfig };

    // You may want to persist this in localStorage for session persistence
    localStorage.setItem('fareConfig', JSON.stringify(this._fareConfig));

    // Emit an event for other components to know about the change
    this.websocketService.emit('fareConfigUpdated', this._fareConfig);

    return of(true);
  }

  // Add this to constructor or ngOnInit of FareService
  initializeFareConfig() {
    // Try to load from localStorage if available
    const savedConfig = localStorage.getItem('fareConfig');
    if (savedConfig) {
      this._fareConfig = JSON.parse(savedConfig);
    }
  }

  calculateFare(route: any): void {
    // Always reference the current configuration
    const config = this._fareConfig;
    let baseFare = 0;
    let additionalFare = 0;
    let studentBaseFare = 0;
    let studentAdditionalFare = 0;

    switch (route.type) {
      case 'Jeepney':
        baseFare = config.jeepney.baseFare;
        additionalFare = Math.max(0, route.distanceInKm - 4) * config.jeepney.additionalFare;
        studentBaseFare = config.jeepney.baseFare * 0.8; // 20% discount
        studentAdditionalFare = Math.max(0, route.distanceInKm - 4) * config.jeepney.additionalFare * 0.8;
        break;
      case 'Bus':
        baseFare = config.bus.baseFare;
        additionalFare = Math.max(0, route.distanceInKm - 5) * config.bus.additionalFare;
        studentBaseFare = config.bus.baseFare * 0.8;
        studentAdditionalFare = Math.max(0, route.distanceInKm - 5) * config.bus.additionalFare * 0.8;
        break;
      case 'Taxi':
        baseFare = config.taxi.baseFare;
        additionalFare = Math.max(0, route.distanceInKm) * config.taxi.additionalFare;
        studentBaseFare = config.taxi.baseFare * 0.8;
        studentAdditionalFare = Math.max(0, route.distanceInKm) * config.taxi.additionalFare * 0.8;
        break;
      default:
        baseFare = config.bus.baseFare;
        additionalFare = Math.max(0, route.distanceInKm - 5) * config.bus.additionalFare;
        studentBaseFare = config.bus.baseFare * 0.8;
        studentAdditionalFare = Math.max(0, route.distanceInKm - 5) * config.bus.additionalFare * 0.8;
        break;
    }

    const totalFare = baseFare + additionalFare;
    const totalStudentFare = studentBaseFare + studentAdditionalFare;

    route.fare = this.roundToNearest25Centavos(totalFare);
    route.studentFare = this.roundToNearest25Centavos(totalStudentFare);
  }

  private roundToNearest25Centavos(amount: number): number {
    return Math.round(amount * 4) / 4;
  }

  calculateDistance(route: any): number {
    let totalDistance = 0;
    const path = route.path || [];

    for (let i = 0; i < path.length - 1; i++) {
      const startLatLng = new google.maps.LatLng(path[i].lat, path[i].lng);
      const endLatLng = new google.maps.LatLng(path[i + 1].lat, path[i + 1].lng);
      totalDistance += google.maps.geometry.spherical.computeDistanceBetween(startLatLng, endLatLng);
    }

    return totalDistance / 1000; // Convert to kilometers
  }

  calculateDuration(currentLocation: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, callback: (duration: string, arrivalTime: string) => void): void {
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [currentLocation],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), // Uses real-time traffic
          trafficModel: google.maps.TrafficModel.BEST_GUESS // Other options: PESSIMISTIC, OPTIMISTIC
        }
      },
      (response: google.maps.DistanceMatrixResponse, status: google.maps.DistanceMatrixStatus) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          let durationText = response.rows[0].elements[0].duration_in_traffic?.text || response.rows[0].elements[0].duration.text;
          durationText = durationText.replace(' mins', 'm').replace(' min', 'm');

          const durationInMinutes = parseInt(durationText.replace('m', ''), 10);
          const currentTime = new Date();
          const arrivalTime = new Date(currentTime.getTime() + durationInMinutes * 60000);
          const arrivalTimeString = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          callback(durationText, arrivalTimeString);
        } else {
          console.error('Error fetching duration: ', status);
        }
      }
    );
  }

  calculateRemainingDuration(currentLocation: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, callback: (duration: string, arrivalTime: string) => void): void {
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [currentLocation],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response: google.maps.DistanceMatrixResponse, status: google.maps.DistanceMatrixStatus) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          let durationText = response.rows[0].elements[0].duration.text;
          durationText = durationText.replace(' mins', 'm').replace(' min', 'm');

          // Calculate the estimated arrival time
          const durationInMinutes = parseInt(durationText.replace('m', ''), 10);
          const currentTime = new Date();
          const arrivalTime = new Date(currentTime.getTime() + durationInMinutes * 60000);
          const arrivalTimeString = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          callback(durationText, arrivalTimeString);
        } else {
          console.error('Error fetching duration: ', status);
        }
      }
    );
  }
}