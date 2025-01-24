import { Injectable } from '@angular/core';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private geocoder = new google.maps.Geocoder();

  geocodeLatLng(latLng: google.maps.LatLngLiteral, callback: (address: string) => void): void {
    this.geocoder.geocode({ location: latLng }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
      if (status === 'OK' && results[0]) {
        let placeName = '';

        for (const component of results[0].address_components) {
          if (component.types.includes('point_of_interest') || component.types.includes('establishment')) {
            placeName = component.long_name;
            break;
          }
        }

        if (!placeName) {
          for (const component of results[0].address_components) {
            if (component.types.includes('locality') || component.types.includes('sublocality')) {
              placeName = component.long_name;
              break;
            }
          }
        }

        if (!placeName) {
          placeName = results[0].formatted_address;
        }

        callback(placeName);
      } else {
        console.error('Geocoder failed due to: ' + status);
        callback('Address not found');
      }
    });
  }
}