import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapInstanceService {
  private map: any;

  setMap(map: any) {
    this.map = map;
  }

  getMap() {
    return this.map;
  }

  setMapStyle(style: any) {
    if (this.map) {
      this.map.setOptions({ styles: style });
    } else {
      console.error('Map instance not found!');
    }
  }
}