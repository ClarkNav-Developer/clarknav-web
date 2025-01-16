import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MapboxSearchService {
  private apiUrl = 'https://api.mapbox.com/search/searchbox/v1/suggest';

  constructor(private http: HttpClient) {}

  search(query: string): Observable<any> {
    const params = {
      q: query,
      access_token: environment.mapboxApiKey,
      limit: '5', // Limit the results
    };
    return this.http.get(this.apiUrl, { params });
  }
}
