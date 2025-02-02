import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User } from '../models/user';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser: User | null = null;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) { }

  // Login method
  login(email: string, password: string): Observable<any> {
    console.debug('Attempting login with email:', email);
    const loginData = { email, password };
    return this.http.post<any>(environment.loginUrl, loginData, { withCredentials: true }).pipe(
      map(response => {
        console.debug('Login response received:', response);
        if (response.token && response.user) {
          this.currentUser = {
            id: response.user.id,
            first_name: response.user.first_name,
            last_name: response.user.last_name,
            email: response.user.email,
            isAdmin: response.user.isAdmin,
            isUser: response.user.isUser,
            token: response.token
          };
          console.log('User logged in successfully:', this.currentUser);
          localStorage.setItem('authToken', response.token); // Store the token
          localStorage.setItem('refreshToken', response.refresh_token); // Store the refresh token
          return response;
        } else {
          console.warn('Login failed:', response);
          throw new Error('Login failed');
        }
      }),
      catchError(error => {
        console.error('Login error occurred:', error);
        alert('Login failed. Please check your credentials and try again.');
        return of(null);
      })
    );
  }

  // Method to get the token
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Method to get the refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  // Logout method
  logout(): Observable<any> {
    console.debug('Logging out...');
    return this.http.post<any>(environment.logoutUrl, {}, { withCredentials: true }).pipe(
      tap(() => {
        console.log('Logout successful.');
        this.currentUser = null;
        localStorage.removeItem('authToken'); // Remove the token
        localStorage.removeItem('refreshToken'); // Remove the refresh token
        alert('You have been logged out successfully.');
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        console.error('Logout error occurred:', error);
        alert('An error occurred during logout. Please try again.');
        return of(null);
      })
    );
  }

  // Get identity method
  getIdentity(): Observable<boolean> {
    console.debug('Fetching user identity');
    return this.http
      .get<{ data: User; succeeded: boolean }>(`${environment.identityUrl}`, {
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          console.log('Identity response:', response);
          if (response.succeeded) {
            this.currentUser = { ...response.data };
            console.log('Current user during identity fetch:', this.currentUser);
            return true;
          }
          return false;
        }),
        catchError((error) => {
          if (error.status === 401) {
            console.warn('Unauthorized access, redirecting to login.');
          } else {
            console.error('Error fetching identity:', error);
          }
          this.router.navigate(['/dashboard']);
          return of(false);
        })
      );
  }

  // Update credentials method
  updateCredentials(updatedCredentials: {
    first_name: string;
    last_name: string;
    current_password?: string;
    new_password?: string;
    new_password_confirmation?: string;
  }): Observable<any> {
    if (!this.currentUser || !this.currentUser.id) {
      console.error('No current user or user ID is missing.');
      return of(null);
    }
    const url = `${environment.updateUserUrl}/${this.currentUser.id}`;
    return this.http
      .put<any>(url, updatedCredentials, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response.succeeded) {
            this.currentUser = {
              ...this.currentUser,
              first_name: updatedCredentials.first_name,
              last_name: updatedCredentials.last_name,
            } as User;
            console.log(
              'User credentials updated successfully',
              this.currentUser
            );
          }
        }),
        catchError((error) => {
          console.error(
            'An error occurred while updating your credentials.',
            error
          );
          if (error.status === 422) {
            console.error('Validation errors:', error.error.errors);
          }
          return of(null);
        })
      );
  }

  // Get current user
  getCurrentUser(): User | null {
    console.debug('Retrieving current user:', this.currentUser);
    return this.currentUser;
  }

  // Register new user
  register(user: any): Observable<any> {
    console.debug('Registering new user:', user);
    return this.http
      .post<any>(environment.registerUrl, user, { withCredentials: true })
      .pipe(
        tap((response) => {
          console.log('Registration successful:', response);
        }),
        catchError((error) => {
          console.error('Registration error occurred:', error);
          alert('Registration failed. Please check your details and try again.');
          return of(null);
        })
      );
  }

  // Refresh token method
  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      console.error("No refresh token available.");
      return of(null);
    }

    return this.http.post<any>(environment.refreshUrl, { refresh_token: refreshToken }, { withCredentials: true }).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem("authToken", response.token);
          console.log("Token refreshed successfully:", response.token);
        } else {
          console.warn("Token refresh failed:", response);
        }
      }),
      catchError(error => {
        console.error("Token refresh error occurred:", error);
        return of(null);
      })
    );
  }

}