import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapStyleService {
  constructor(private http: HttpClient) {}

  loadMapStyle(styleUrl: string): Observable<any> {
    return this.http.get<any>(styleUrl);
  }
}