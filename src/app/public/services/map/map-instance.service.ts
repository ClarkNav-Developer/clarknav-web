import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapInstanceService {
  private map: any;
  private mapReadyPromise: Promise<any>;
  private mapReadyResolver!: (map: any) => void;

  constructor() {
    this.mapReadyPromise = new Promise(resolve => {
      this.mapReadyResolver = resolve;
    });
  }

  setMap(map: any) {
    this.map = map;
    this.mapReadyResolver(map); // Resolve the promise once the map is set
  }

  async getMap(): Promise<any> {
    if (!this.map) {
      console.warn('Waiting for map instance to be set...');
    }
    return this.mapReadyPromise;
  }

  async setMapStyle(style: any) {
    const map = await this.getMap(); // Wait until the map is ready
    if (map) {
      map.setOptions({ styles: style });
    } else {
      console.error('Map instance not found!');
    }
  }
}
