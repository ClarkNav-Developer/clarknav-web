import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NavigationHistoryService {
    private apiUrl = 'http://127.0.0.1:8000/api/navigation-histories';

    constructor(private http: HttpClient) { }

    getNavigationHistories(): Observable<any> {
        return this.http.get(this.apiUrl);
    }
}