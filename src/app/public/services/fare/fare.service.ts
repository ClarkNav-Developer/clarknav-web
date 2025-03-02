import { Injectable } from '@angular/core';
import { WebsocketService } from '../websocket/websocket.service';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class FareService {
  constructor(private websocketService: WebsocketService) {}

  calculateFare(route: any): void {
    let baseFare = 0;
    let additionalFare = 0;
    let studentBaseFare = 0;
    let studentAdditionalFare = 0;

    switch (route.type) {
      case 'Jeepney':
        baseFare = 13; // Base fare for first 4 kilometers
        additionalFare = Math.max(0, route.distanceInKm - 4) * 1.80; // Rate for succeeding kilometers
        studentBaseFare = 10.40; // Discounted base fare for first 4 kilometers
        studentAdditionalFare = Math.max(0, route.distanceInKm - 4) * 1.44; // Discounted rate for succeeding kilometers
        break;
      case 'Bus':
        baseFare = 15; // Base fare for first 5 kilometers
        additionalFare = Math.max(0, route.distanceInKm - 5) * 2.65; // Rate for succeeding kilometers
        // studentBaseFare = 12; // Discounted base fare for first 5 kilometers
        // studentAdditionalFare = Math.max(0, route.distanceInKm - 5) * 2.12; // Discounted rate for succeeding kilometers
        break;
      case 'Taxi':
        baseFare = 50; // Flag down rate
        additionalFare = Math.max(0, route.distanceInKm) * 13.50; // Rate for succeeding kilometers
        studentBaseFare = 50 * 0.8; // Discounted flag down rate (20% discount)
        studentAdditionalFare = Math.max(0, route.distanceInKm) * 13.50 * 0.8; // Discounted rate for succeeding kilometers (20% discount)
        break;
      default:
        baseFare = 15; // Default base fare for first 5 kilometers
        additionalFare = Math.max(0, route.distanceInKm - 5) * 2.65; // Default rate for succeeding kilometers
        studentBaseFare = 12; // Default discounted base fare for first 5 kilometers
        studentAdditionalFare = Math.max(0, route.distanceInKm - 5) * 2.12; // Default discounted rate for succeeding kilometers
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