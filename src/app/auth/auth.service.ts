import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { User } from '../models/user';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  // Handle HTTP operation that failed.
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
  private currentUser: User | null = null;
  private apiUrl = environment.apiUrl;
  public isAuthenticated = false;
  private cachedIdentity: Observable<boolean> | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenService: TokenService
  ) {
    this.initializeAuthState();
  }

  // Initialize authentication state
  private initializeAuthState() {
    const token = this.tokenService.getToken();
    if (token) {
      this.isAuthenticated = true;
      this.getIdentity().subscribe({
        next: (isAuthenticated) => {
          if (!isAuthenticated) {
            this.clearTokensAndLogout();
          }
        },
        error: () => {
          this.clearTokensAndLogout();
        },
      });
    }
  }

  // Clear tokens and log out
  private clearTokensAndLogout() {
    this.tokenService.clearTokens();
    this.isAuthenticated = false;
    this.currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/login']);
  }

  // Login method
  login(email: string, password: string): Observable<any> {
    const loginData = { email, password };
    return this.http
      .post<any>(environment.loginUrl, loginData, { withCredentials: true })
      .pipe(
        map((response) => {
          if (response.token && response.user) {
            this.currentUser = response.user;
            this.tokenService.setTokens(response.token, response.refresh_token);
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('refreshToken', response.refresh_token);
            this.isAuthenticated = true;
            return response;
          } else {
            throw new Error('Login failed');
          }
        }),
        catchError((error) => {
          console.error('Login error occurred:', error);
          toastr.error(
            'Login failed. Please check your credentials and try again.'
          );
          return of(null);
        })
      );
  }

  // Logout method
  logout(): Observable<any> {
    return this.http
      .post<any>(environment.logoutUrl, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.clearTokensAndLogout();
          toastr.success('You have been logged out successfully.');
        }),
        catchError((error) => {
          console.error('Logout error occurred:', error);
          toastr.error('An error occurred during logout. Please try again.');
          return of(null);
        })
      );
  }

  // Get identity method
  getIdentity(): Observable<boolean> {
    if (!this.isAuthenticated) {
      return of(false);
    }

    if (this.cachedIdentity) {
      return this.cachedIdentity;
    }

    this.cachedIdentity = this.http
      .get<{ data: User; succeeded: boolean }>(`${environment.identityUrl}`, {
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          if (response.succeeded) {
            this.currentUser = response.data;
            this.isAuthenticated = true;
            return true;
          }
          return false;
        }),
        catchError((error) => {
          if (error.status === 401) {
            this.clearTokensAndLogout();
          }
          return of(false);
        }),
        shareReplay(1)
      );

    return this.cachedIdentity;
  }

  // Clear cached identity
  clearCachedIdentity() {
    this.cachedIdentity = null;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
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
          }
        }),
        catchError((error) => {
          console.error(
            'An error occurred while updating your credentials.',
            error
          );
          return of(null);
        })
      );
  }

  // Register new user
  register(user: any): Observable<any> {
    return this.http
      .post<any>(environment.registerUrl, user, { withCredentials: true })
      .pipe(
        tap((response) => {
          console.log('Registration successful:', response);
        }),
        catchError((error) => {
          console.error('Registration error occurred:', error);
          toastr.error(
            'Registration failed. Please check your details and try again.'
          );
          return of(null);
        })
      );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http
      .post(`${environment.forgotPasswordUrl}`, { email })
      .pipe(catchError(this.handleError('Password reset request failed')));
  }

  resetPassword(
    token: string,
    email: string,
    password: string,
    password_confirmation: string
  ): Observable<any> {
    return this.http
      .post<any>(`${environment.resetPasswordUrl}`, {
        token,
        email,
        password,
        password_confirmation,
      })
      .pipe(catchError(this.handleError('Password reset failed')));
  }

  verifyEmail(token: string, email: string): Observable<any> {
    return this.http
      .post<any>(`${environment.verifyEmailUrl}`, { token, email })
      .pipe(catchError(this.handleError('Email verification failed')));
  }
}
