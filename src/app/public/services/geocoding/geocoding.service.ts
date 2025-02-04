import { Injectable } from '@angular/core';
import { GoogleMapsLoaderService } from './google-maps-loader.service';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private geocoder: google.maps.Geocoder | null = null;

  // Add GoogleMapsLoaderService to the constructor
  constructor(private googleMapsLoader: GoogleMapsLoaderService) {
    this.googleMapsLoader.load().then(() => {
      this.geocoder = new google.maps.Geocoder();
    }).catch(error => {
      console.error('Error loading Google Maps API:', error);
    });
  }

  geocodeLatLng(latLng: google.maps.LatLngLiteral, callback: (address: string) => void): void {
    if (!this.geocoder) {
      console.error('Geocoder is not initialized.');
      return;
    }

    this.geocoder.geocode({ location: latLng }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
      if (status === 'OK' && results && results[0]) {
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