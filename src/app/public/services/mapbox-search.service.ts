import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapboxSearchService {
  private apiUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/{searchQuery}.json';

  constructor(private http: HttpClient) { }

  search(query: string): Observable<any> {
    const proximityCoordinates = [120.55950164794922, 15.187769063648858]; // Your specified location
    
    const params = {
      access_token: environment.mapboxApiKey,
      limit: '5', // Limit the results
      proximity: proximityCoordinates.join(','), // Proximity bias parameter
    };
    
    return this.http.get(this.apiUrl.replace("{searchQuery}", query), { params });
  }
}