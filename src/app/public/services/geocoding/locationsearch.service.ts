import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LocationSearchService {
    private apiUrl = 'http://localhost:8000/api/location-searches';

    constructor(private http: HttpClient) { }

    createLocationSearch(origin: string, destination: string): Observable<any> {
        const body = { origin, destination };
        return this.http.post(this.apiUrl, body);
    }
}