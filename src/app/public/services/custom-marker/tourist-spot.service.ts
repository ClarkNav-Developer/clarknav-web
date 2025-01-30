import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TouristSpotService {

  constructor(private http: HttpClient) { }

  getTouristSpots(): Observable<any> {
    return this.http.get('/assets/tourist-spots.json');
  }
}