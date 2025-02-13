import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GeocodingService } from './geocoding.service';
import { GoogleMapsLoaderService } from './google-maps-loader.service';
import { MapService } from '../map/map.service';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { LocationSearch } from '../../../models/locationsearch';

declare var google: any;

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  currentLocation: google.maps.LatLngLiteral | null = null;
  destination: google.maps.LatLngLiteral | null = null;
  currentLocationAddress = 'Loading...';
  destinationAddress = 'Loading...';
  public locationSearchesUrl = environment.locationSearchesUrl;

  constructor(
    private geocodingService: GeocodingService,
    private http: HttpClient,
    private googleMapsLoader: GoogleMapsLoaderService,
    private mapService: MapService
  ) {}

  reverseLocation(): void {
    if (this.currentLocation && this.destination) {
      [this.currentLocation, this.destination] = [
        this.destination,
        this.currentLocation,
      ];

      const currentLocationInput = document.getElementById(
        'current-location-box'
      ) as HTMLInputElement;
      const destinationInput = document.getElementById(
        'search-box'
      ) as HTMLInputElement;

      if (currentLocationInput && destinationInput) {
        const tempValue = currentLocationInput.value;
        currentLocationInput.value = destinationInput.value;
        destinationInput.value = tempValue;
      }

      this.resolveAddresses();
    } else {
      alert('Both current location and destination must be set to reverse.');
    }
  }

  useMyLocation(): void {
    this.googleMapsLoader
      .load()
      .then(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              this.currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              console.log('Current Location:', this.currentLocation);
              const currentLocationInput = document.getElementById(
                'current-location-box'
              ) as HTMLInputElement;
              const currentLocationInputMobile = document.getElementById(
                'current-location-box-mobile'
              ) as HTMLInputElement;
              if (currentLocationInput || currentLocationInputMobile) {
                this.geocodingService.geocodeLatLng(
                  this.currentLocation,
                  (address: string) => {
                    if (currentLocationInput) {
                      currentLocationInput.value = address;
                    }
                    if (currentLocationInputMobile) {
                      currentLocationInputMobile.value = address;
                    }
                    this.currentLocationAddress = address;
                  }
                );
              }
              this.resolveAddresses();
  
              this.mapService.addMarker(this.currentLocation, 'My Location', true);
              this.mapService.map.panTo(this.currentLocation);
            },
            (error) => {
              console.error('Error fetching location', error);
              alert('Unable to fetch your current location.');
            }
          );
        } else {
          alert('Geolocation is not supported by your browser.');
        }
      })
      .catch((error) => {
        console.error('Error loading Google Maps API:', error);
      });
  }

  resolveAddresses(): void {
    if (this.currentLocation) {
      this.geocodingService.geocodeLatLng(
        this.currentLocation,
        (address: string) => {
          this.currentLocationAddress = address || 'Unable to resolve address';
          console.log(
            'Resolved current location address:',
            this.currentLocationAddress
          );
          this.saveLocationSearchIfComplete();
        }
      );
    } else {
      this.currentLocationAddress = 'Current location not set';
    }

    if (this.destination) {
      this.geocodingService.geocodeLatLng(
        this.destination,
        (address: string) => {
          this.destinationAddress = address || 'Unable to resolve address';
          console.log('Resolved destination address:', this.destinationAddress);
          this.saveLocationSearchIfComplete();
        }
      );
    } else {
      this.destinationAddress = 'Destination not set';
    }
  }

  private saveLocationSearchIfComplete(): void {
    if (
      this.currentLocationAddress &&
      this.destinationAddress &&
      this.currentLocationAddress !== 'Current location not set' &&
      this.destinationAddress !== 'Destination not set'
    ) {
      console.log('Saving location search with the following details:');
      console.log('Current Location Address:', this.currentLocationAddress);
      console.log('Destination Address:', this.destinationAddress);
      this.createLocationSearch(
        this.currentLocationAddress,
        this.destinationAddress
      ).subscribe(
        (response) => {
          console.log('Location search saved:', response);
        },
        (error) => {
          console.error('Error saving location search:', error);
        }
      );
    }
  }

  private createLocationSearch(origin: string, destination: string): Observable<any> {
    const body = { origin, destination };
    return this.http.post(this.locationSearchesUrl, body);
  }

  getLocationSearches(): Observable<LocationSearch[]> {
    return this.http.get<LocationSearch[]>(this.locationSearchesUrl);
  }
}