import { Component, OnInit } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'ClarkNav';

  ngOnInit() {
    this.loadMapboxApi();
  }

  loadMapboxApi() {
    const script = document.createElement('script');
    script.src = `https://api.mapbox.com/mapbox-gl-js/v2.8.0/mapbox-gl.js`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

  }
}
