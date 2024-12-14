import { Component, OnInit } from '@angular/core';

declare var google: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {
    this.initAutocomplete();
  }

  display: any;
  center: google.maps.LatLngLiteral = {
    lat: 15.187769063648858,
    lng: 120.55950164794922
  };
  zoom = 14;

  /*------------------------------------------
  --------------------------------------------
  moveMap()
  --------------------------------------------
  --------------------------------------------*/
  moveMap(event: google.maps.MapMouseEvent) {
    if (event.latLng != null) this.center = (event.latLng.toJSON());
  }

  /*------------------------------------------
  --------------------------------------------
  move()
  --------------------------------------------
  --------------------------------------------*/
  move(event: google.maps.MapMouseEvent) {
    if (event.latLng != null) this.display = event.latLng.toJSON();
  }

  /*------------------------------------------
  --------------------------------------------
  initAutocomplete()
  --------------------------------------------
  --------------------------------------------*/
  initAutocomplete() {
    const input = document.getElementById('search-box') as HTMLInputElement;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'PH' },  // Restrict to the Philippines
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(15.167864949136394, 120.48439979553223),  // Southwest coordinates of Clark
        new google.maps.LatLng(15.22415233433501, 120.58105440940092)   // Northeast coordinates of Clark
      ),
      strictBounds: true,  // Ensure results are strictly within the bounds of Clark
      // Removed 'types' property to allow all types of places
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        this.center = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        this.zoom = 15;  // Set a higher zoom when a place is selected
      }
    });
  }
}
