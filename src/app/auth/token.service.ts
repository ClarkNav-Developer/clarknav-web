import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  constructor(private http: HttpClient) {}

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  setTokens(token: string, refreshToken: string): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }
}