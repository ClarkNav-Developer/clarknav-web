import { Injectable } from '@angular/core';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class FareService {
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

  calculateDuration(currentLocation: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral, callback: (duration: string) => void): void {
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
          callback(durationText);
        } else {
          console.error('Error fetching duration: ', status);
        }
      }
    );
  }
}