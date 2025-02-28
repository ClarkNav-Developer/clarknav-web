import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, throwError, map, tap, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  currentUserSubject = new BehaviorSubject<User | null>(null);
  // private isEmailVerifiedSubject = new BehaviorSubject<boolean>(false); // Remove this line
  private readonly STORAGE_KEY = 'user_session';
  private csrfTokenFetched = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuthState();
  }

  // Initialize auth state and get CSRF token
  private initializeAuthState(): void {
    this.getCsrfToken().subscribe({
      next: () => {
        const storedSession = sessionStorage.getItem(this.STORAGE_KEY);
        if (storedSession) {
          const session = JSON.parse(storedSession);
          this.setAuthenticated(true, session.user);
          // this.isEmailVerifiedSubject.next(!!session.user.email_verified_at); // Remove this line
          this.validateSession();
        }
      },
      error: (error) => {
        console.error('Failed to get CSRF token:', error);
        this.handleAuthenticationFailure();
      }
    });
  }

  // Get CSRF token from Laravel Sanctum
  private getCsrfToken(): Observable<void> {
    console.log('CSRF Token Fetch Attempt:', this.csrfTokenFetched); // Debug log
    if (this.csrfTokenFetched) {
      return of(undefined); // Prevent multiple CSRF token fetch requests
    }
    return this.http.get<void>(`${environment.webUrl}/sanctum/csrf-cookie`, { withCredentials: true }).pipe(
      tap(() => {
        this.csrfTokenFetched = true;
        console.log('CSRF Token Fetched Successfully'); // Debug log
      }),
      catchError(error => {
        console.error('Failed to get CSRF token:', error);
        return throwError(() => new Error('Failed to get CSRF token'));
      })
    );
  }

  // Validate current session
  private validateSession(): void {
    this.getAuthenticatedUser().subscribe({
      next: (user) => {
        if (!user) {
          this.handleAuthenticationFailure();
        }
      },
      error: () => this.handleAuthenticationFailure()
    });
  }

  // Handle auth failure
  private handleAuthenticationFailure(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // Clear session data
  private clearSession(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.setAuthenticated(false, null);
    // this.isEmailVerifiedSubject.next(false); // Remove this line
  }

  // Update auth state
  public setAuthenticated(isAuthenticated: boolean, user: User | null): void {
    this.isAuthenticatedSubject.next(isAuthenticated);
    this.currentUserSubject.next(user);

    if (isAuthenticated && user) {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify({ user }));
      // this.isEmailVerifiedSubject.next(!!user.email_verified_at); // Remove this line
      console.log('User logged in:', user); // Debug log
    }
  }

  // Login
  login(email: string, password: string, rememberMe: boolean): Observable<any> {
    return this.getCsrfToken().pipe(
      switchMap(() => {
        return this.http.post<any>(environment.auth.login, {
          email,
          password,
          remember: rememberMe
        }, { withCredentials: true }).pipe(
          tap(response => {
            console.log('Login API Response:', response); // Debug log
            if (response && response.user) {
              this.setAuthenticated(true, response.user);
              // if (!response.user.email_verified_at) { // Remove this block
              //   this.router.navigate(['/verify-email']);
              // } else {
                this.handleRoleBasedRedirection(response.user);
              // }
            }
          }),
          catchError(error => {
            console.error('Login API Error:', error); // Debug log
            throw error;
          })
        );
      }),
      catchError(this.handleError('Login failed'))
    );
  }

  // Register
  register(user: Partial<User>): Observable<any> {
    return this.getCsrfToken().pipe(
      switchMap(() => {
        return this.http.post<any>(environment.auth.register, user, {
          withCredentials: true
        }).pipe(
          tap(response => {
            if (response && response.user) {
              this.setAuthenticated(true, response.user);
              // if (!response.user.email_verified_at) { // Remove this block
              //   this.router.navigate(['/verify-email']);
              // } else {
                this.handleRoleBasedRedirection(response.user);
              // }
            }
          }),
          catchError(this.handleError('Registration failed'))
        );
      })
    );
  }

  // Remove email verification methods
  // sendVerificationEmail(): Observable<any> {
  //   return this.http.post<any>(`${environment.auth.emailVerificationNotification}`, {}, {
  //     withCredentials: true
  //   }).pipe(
  //     catchError(this.handleError('Failed to send verification email'))
  //   );
  // }

  // verifyEmail(id: string, hash: string): Observable<any> {
  //   return this.http.get<any>(`${environment.auth.verifyEmail}/${id}/${hash}`, {
  //     withCredentials: true
  //   }).pipe(
  //     tap(response => {
  //       if (response && response.user) {
  //         this.setAuthenticated(true, response.user);
  //         this.isEmailVerifiedSubject.next(true);
  //       }
  //     }),
  //     catchError(this.handleError('Email verification failed'))
  //   );
  // }

  // Logout
  logout(): Observable<any> {
    return this.http.post<any>(environment.auth.logout, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.clearSession();
        this.router.navigate(['/login']);
      }),
      catchError(this.handleError('Logout failed'))
    );
  }

  // Get authenticated user
  getAuthenticatedUser(): Observable<User> {
    return this.http.get<User>(environment.user.getAuthenticatedUser, {
      withCredentials: true
    }).pipe(
      tap(user => {
        if (user) {
          this.setAuthenticated(true, user);
        }
      }),
      catchError(this.handleError('Failed to get authenticated user'))
    );
  }

  // Update user
  updateUser(user: Partial<User>): Observable<User> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser?.id) {
      return throwError(() => new Error('No authenticated user'));
    }

    return this.http.put<User>(
      environment.user.updateUser(currentUser.id),
      user,
      { withCredentials: true }
    ).pipe(
      tap(updatedUser => {
        this.setAuthenticated(true, updatedUser);
      }),
      catchError(this.handleError('User update failed'))
    );
  }

  // Password reset request
  forgotPassword(email: string): Observable<any> {
    return this.getCsrfToken().pipe(
      switchMap(() => this.http.post(environment.auth.forgotPassword, { email }, { withCredentials: true })),
      catchError((error) => {
        console.error('Password reset request failed:', error);
        return throwError(() => new Error('Password reset request failed'));
      })
    );
  }

  // Reset password
  resetPassword(token: string, email: string, password: string, password_confirmation: string): Observable<any> {
    return this.getCsrfToken().pipe(
      map(() => {
        return this.http.post<any>(environment.auth.resetPassword, {
          token,
          email,
          password,
          password_confirmation
        }, { withCredentials: true });
      }),
      catchError(this.handleError('Password reset failed'))
    );
  }

  // Remove resend verification email method
  // resendVerificationEmail(): Observable<any> {
  //   return this.http.post<any>(environment.auth.emailVerificationNotification, {}, {
  //     withCredentials: true
  //   }).pipe(
  //     catchError(this.handleError('Failed to resend verification email'))
  //   );
  // }

  // Add this method for confirming password
  confirmPassword(password: string): Observable<any> {
    return this.getCsrfToken().pipe(
      switchMap(() => {
        return this.http.post<any>(environment.auth.confirmPassword, {
          password
        }, { withCredentials: true });
      }),
      catchError(this.handleError('Password confirmation failed'))
    );
  }

  // Role-based navigation
  private handleRoleBasedRedirection(user: User): void {
    // if (!user.email_verified_at) { // Remove this block
    //   this.router.navigate(['/verify-email']);
    // } else 
    if (user.isAdmin) {
      this.router.navigate(['/admin/admin-dashboard']);
    } else if (user.isUser) {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/']);
    }
  }

  // Role checks
  isAdmin(): boolean {
    return this.currentUserSubject.value?.isAdmin || false;
  }

  isUser(): boolean {
    return this.currentUserSubject.value?.isUser || false;
  }

  // Access control
  canAccessAdmin(): boolean {
    return this.isAuthenticatedSubject.value && this.isAdmin(); // Remove email verification check
  }

  canAccessUser(): boolean {
    return this.isAuthenticatedSubject.value && this.isUser(); // Remove email verification check
  }

  // Observable getters
  get isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  get currentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  // Remove email verification observable getter
  // get isEmailVerified(): Observable<boolean> {
  //   return this.isEmailVerifiedSubject.asObservable();
  // }

  // Error handler
  private handleError(operation: string) {
    return (error: HttpErrorResponse) => {
      console.error(`${operation}:`, error);
      return throwError(() => new Error(`${operation}: ${error.message}`));
    };
  }
}