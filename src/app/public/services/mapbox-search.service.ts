import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapboxSearchService {
  private apiUrl = 'https://api.mapbox.com/search/searchbox/v1/suggest?q={searchQuery}.JSON';
  sessionToken: string;

  constructor(private http: HttpClient) {
    this.sessionToken = this.generateSessionToken();
  }

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2);
  }

  search(query: string, proximity?: [number, number]): Observable<any> {
    const params: any = {
      access_token: environment.mapboxApiKey,
      limit: '5', // Limit the results
      session_token: this.sessionToken,
    };

    if (proximity) {
      params.proximity = proximity.join(',');
    }

    console.log('Making API request with params:', params);
    return this.http.get(this.apiUrl.replace("{searchQuery}", query), { params });
  }
}