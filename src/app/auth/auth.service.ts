// filepath: /path/to/your/angular/project/src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  register(data: any): Observable<any> {
    console.log('Attempting to register with data:', data);
    return this.http.post(environment.registerUrl, data, { withCredentials: true }).pipe(
      tap(response => {
        console.log('Registration response:', response);
      }),
      catchError(error => {
        console.error('Registration error:', error);
        throw error;
      })
    );
  }

  login(data: any): Observable<any> {
    console.log('Attempting to login with data:', data);
    return this.http.post(environment.loginUrl, data, { withCredentials: true }).pipe(
      tap(response => {
        console.log('Login response:', response);
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  logout(): Observable<any> {
    console.log('Attempting to logout');
    return this.http.post(environment.logoutUrl, {}, { withCredentials: true }).pipe(
      tap(response => {
        console.log('Logout response:', response);
      }),
      catchError(error => {
        console.error('Logout error:', error);
        throw error;
      })
    );
  }
}