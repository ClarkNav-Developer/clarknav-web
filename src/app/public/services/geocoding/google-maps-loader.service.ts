import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsLoaderService {
  private apiLoaded = false;
  private apiLoadPromise: Promise<void>;

  constructor() {
    this.apiLoadPromise = new Promise<void>((resolve, reject) => {
      if (this.apiLoaded) {
        resolve();
      } else {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.apiLoaded = true;
          resolve();
        };
        script.onerror = (error) => reject(error);
        document.head.appendChild(script);
      }
    });
  }

  load(): Promise<void> {
    return this.apiLoadPromise;
  }
}