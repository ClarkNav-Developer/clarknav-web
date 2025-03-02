import { Injectable } from '@angular/core';
import { WebsocketService } from '../websocket/websocket.service';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class FareService {
  constructor(private websocketService: WebsocketService) {}

  calculateFare(route: any): void {
    const baseFare = 13;
    const additionalFare = Math.max(0, route.distanceInKm - 4) * 1.8;
    const totalFare = baseFare + additionalFare;

    route.fare = Math.ceil(totalFare);
    route.studentFare = Math.ceil(totalFare * 0.8);
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