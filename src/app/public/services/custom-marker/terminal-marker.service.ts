import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TerminalMarkerService {
  private terminalsUrl = 'assets/terminals.json';

  jeepney = [];
  bus = [];

  constructor(private http: HttpClient) { }

  // Fetch terminals from the JSON file
  getTerminals(): Observable<any[]> {
    return this.http.get<any[]>(this.terminalsUrl);
  }
}
