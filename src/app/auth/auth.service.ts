import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, switchMap, finalize, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Auth state observables
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  private isUserSubject = new BehaviorSubject<boolean>(false);
  
  // Constants
  private readonly STORAGE_KEY = 'user_session';
  private readonly TOKEN_KEY = 'auth_token';
  
  // CSRF token tracking
  private csrfTokenFetched = false;
  private tokenRefreshInProgress = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuthState();
  }

  // ==================== PUBLIC API ====================

  // Authentication state observables
  get isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  get currentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  get isAdmin(): Observable<boolean> {
    return this.isAdminSubject.asObservable();
  }

  get isUser(): Observable<boolean> {
    return this.isUserSubject.asObservable();
  }

  // Direct access to current values
  get isAuthenticatedValue(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  get isAdminValue(): boolean {
    return this.isAdminSubject.value;
  }

  get isUserValue(): boolean {
    return this.isUserSubject.value;
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Auth check methods
  canAccessAdmin(): boolean {
    const result = this.isAuthenticatedValue && this.isAdminValue;
    console.log('[Auth] Admin access check:', result);
    return result;
  }

  canAccessUser(): boolean {
    const result = this.isAuthenticatedValue && this.isUserValue;
    console.log('[Auth] User access check:', result);
    return result;
  }

  // Authentication methods
  login(email: string, password: string, rememberMe: boolean): Observable<any> {
    console.log('[Auth] Login attempt:', email);
    
    return this.ensureCsrfToken().pipe(
      switchMap(() => {
        const options = this.getRequestOptions();
        
        return this.http.post<any>(environment.auth.login, {
          email,
          password,
          remember: rememberMe
        }, options).pipe(
          tap(response => {
            console.log('[Auth] Login successful');
            this.handleSuccessfulAuth(response);
            
            if (response.token) {
              this.storeToken(response.token);
            }
          })
        );
      }),
      catchError(error => {
        console.error('[Auth] Login failed:', error);
        return this.handleError('Login failed')(error);
      })
    );
  }

  register(user: Partial<User>): Observable<any> {
    console.log('[Auth] Registration attempt');
    
    return this.ensureCsrfToken().pipe(
      switchMap(() => {
        const options = this.getRequestOptions();
        
        return this.http.post<any>(environment.auth.register, user, options).pipe(
          tap(response => {
            console.log('[Auth] Registration successful');
            this.handleSuccessfulAuth(response);
            
            if (response.token) {
              this.storeToken(response.token);
            }
          })
        );
      }),
      catchError(error => {
        console.error('[Auth] Registration failed:', error);
        return this.handleError('Registration failed')(error);
      })
    );
  }

  logout(): Observable<any> {
    console.log('[Auth] Logout attempt');
    
    // Even if the logout API call fails, we'll clear the local session
    const options = this.getRequestOptions();
    
    return this.http.post<any>(environment.auth.logout, {}, options).pipe(
      finalize(() => {
        this.clearSession();
        this.router.navigate(['/login']);
        console.log('[Auth] Logout complete');
      }),
      catchError(error => {
        console.warn('[Auth] Logout API call failed, but session was cleared locally');
        return of(null); // Return a success observable even if the API call fails
      })
    );
  }

  // User data methods
  getAuthenticatedUser(): Observable<User> {
    console.log('[Auth] Retrieving authenticated user');
    const options = this.getRequestOptions();
    
    return this.http.get<User>(environment.user.getAuthenticatedUser, options).pipe(
      tap(user => {
        console.log('[Auth] User data retrieved:', user);
        if (user) {
          this.updateUserState(user);
        }
      }),
      catchError(error => {
        console.error('[Auth] Failed to get authenticated user:', error);
        if (error.status === 401) {
          this.clearSession();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  updateUser(user: Partial<User>): Observable<User> {
    const currentUser = this.currentUserValue;
    if (!currentUser?.id) {
      return throwError(() => new Error('No authenticated user'));
    }

    const options = this.getRequestOptions();
    
    return this.http.put<User>(
      environment.user.updateUser(currentUser.id),
      user,
      options
    ).pipe(
      tap(updatedUser => {
        console.log('[Auth] User updated:', updatedUser);
        this.updateUserState(updatedUser);
      }),
      catchError(this.handleError('User update failed'))
    );
  }

  // Password methods
  forgotPassword(email: string): Observable<any> {
    console.log('[Auth] Password reset request for:', email);
    
    return this.ensureCsrfToken().pipe(
      switchMap(() => {
        const options = this.getRequestOptions();
        
        return this.http.post(environment.auth.forgotPassword, { email }, options).pipe(
          tap(() => console.log('[Auth] Password reset email sent'))
        );
      }),
      catchError(error => {
        console.error('[Auth] Password reset request failed:', error);
        return throwError(() => new Error('Password reset request failed'));
      })
    );
  }

  resetPassword(token: string, email: string, password: string, password_confirmation: string): Observable<any> {
    console.log('[Auth] Password reset attempt');
    
    return this.ensureCsrfToken().pipe(
      switchMap(() => {
        const options = this.getRequestOptions();
        
        return this.http.post<any>(environment.auth.resetPassword, {
          token,
          email,
          password,
          password_confirmation
        }, options).pipe(
          tap(() => console.log('[Auth] Password reset successful'))
        );
      }),
      catchError(this.handleError('Password reset failed'))
    );
  }

  confirmPassword(password: string): Observable<any> {
    console.log('[Auth] Password confirmation attempt');
    
    return this.ensureCsrfToken().pipe(
      switchMap(() => {
        const options = this.getRequestOptions();
        
        return this.http.post<any>(environment.auth.confirmPassword, {
          password
        }, options).pipe(
          tap(() => console.log('[Auth] Password confirmed'))
        );
      }),
      catchError(this.handleError('Password confirmation failed'))
    );
  }

  // ==================== PRIVATE IMPLEMENTATION ====================

  private initializeAuthState(): void {
    console.log('[Auth] Initializing auth state');
    
    // Try to retrieve user from session storage
    const storedSession = sessionStorage.getItem(this.STORAGE_KEY);
    const storedToken = localStorage.getItem(this.TOKEN_KEY);
    
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        console.log('[Auth] Found stored session:', session);
        
        if (session.user) {
          this.updateUserState(session.user);
          // Validate the session with the server
          this.validateSession();
        }
      } catch (e) {
        console.error('[Auth] Failed to parse stored session:', e);
        this.clearSession();
      }
    } else {
      console.log('[Auth] No stored session found');
      
      // If we have a token but no session, try to get the user data
      if (storedToken) {
        console.log('[Auth] Found token without session, retrieving user data');
        this.validateSession();
      }
    }
    
    // Always ensure we have a CSRF token
    this.ensureCsrfToken().subscribe({
      error: error => console.error('[Auth] Initial CSRF token fetch failed:', error)
    });
  }

  private validateSession(): void {
    console.log('[Auth] Validating session with server');
    
    this.getAuthenticatedUser().subscribe({
      next: (user) => {
        console.log('[Auth] Session validated successfully');
      },
      error: (error) => {
        console.error('[Auth] Session validation failed:', error);
        this.handleAuthenticationFailure();
      }
    });
  }

  private ensureCsrfToken(): Observable<void> {
    if (this.csrfTokenFetched) {
      return of(undefined);
    }
    
    console.log('[Auth] Fetching CSRF token');
    return this.http.get<void>(`${environment.webUrl}/sanctum/csrf-cookie`, { 
      withCredentials: true 
    }).pipe(
      tap(() => {
        this.csrfTokenFetched = true;
        console.log('[Auth] CSRF token fetched successfully');
      }),
      catchError(error => {
        console.error('[Auth] Failed to get CSRF token:', error);
        this.csrfTokenFetched = false; // Allow retry on next attempt
        return throwError(() => new Error('Failed to get CSRF token'));
      })
    );
  }

  private handleSuccessfulAuth(response: any): void {
    if (!response) {
      console.error('[Auth] Empty auth response');
      return;
    }
    
    const user = response.user;
    if (!user) {
      console.error('[Auth] Auth response missing user data');
      return;
    }
    
    console.log('[Auth] Auth successful, user:', user);
    console.log('[Auth] User roles - Admin:', !!user.isAdmin, 'User:', !!user.isUser);
    
    // Ensure boolean values for roles
    user.isAdmin = this.ensureBoolean(user.isAdmin);
    user.isUser = this.ensureBoolean(user.isUser);
    
    this.updateUserState(user);
    this.navigateBasedOnRole(user);
  }

  private updateUserState(user: User): void {
    // Ensure boolean values for roles
    const isAdmin = this.ensureBoolean(user.isAdmin);
    const isUser = this.ensureBoolean(user.isUser);
    
    user = {
      ...user,
      isAdmin,
      isUser
    };
    
    console.log('[Auth] Updating user state:', user);
    console.log('[Auth] Role state - Admin:', isAdmin, 'User:', isUser);
    
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    this.isAdminSubject.next(isAdmin);
    this.isUserSubject.next(isUser);
    
    // Store in session
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify({ user }));
  }

  private navigateBasedOnRole(user: User): void {
    // Ensure boolean values
    const isAdmin = this.ensureBoolean(user.isAdmin);
    const isUser = this.ensureBoolean(user.isUser);
    
    console.log('[Auth] Navigating based on role - Admin:', isAdmin, 'User:', isUser);
    
    if (isAdmin) {
      console.log('[Auth] Redirecting to admin dashboard');
      this.router.navigate(['/admin/admin-dashboard']);
    } else if (isUser) {
      console.log('[Auth] Redirecting to user dashboard');
      this.router.navigate(['/']);
    } else {
      console.log('[Auth] No specific role, redirecting to home');
      this.router.navigate(['/']);
    }
  }

  private handleAuthenticationFailure(): void {
    console.log('[Auth] Authentication failure, clearing session');
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    console.log('[Auth] Clearing session');
    
    sessionStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isAdminSubject.next(false);
    this.isUserSubject.next(false);
    
    // Reset CSRF token status to ensure a new one is fetched on next login
    this.csrfTokenFetched = false;
  }

  private storeToken(token: string): void {
    console.log('[Auth] Storing authentication token');
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getRequestOptions(): { withCredentials: boolean, headers?: HttpHeaders } {
    const options: { withCredentials: boolean, headers?: HttpHeaders } = {
      withCredentials: true
    };
    
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      options.headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    
    return options;
  }

  private ensureBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    
    if (typeof value === 'number') {
      return value === 1;
    }
    
    return !!value;
  }

  private handleError(operation: string) {
    return (error: HttpErrorResponse) => {
      console.error(`[Auth] ${operation}:`, error);
      
      // For authentication errors, clear the session
      if (error.status === 401) {
        this.clearSession();
      }
      
      // Create a user-friendly error message
      let errorMessage = `${operation}`;
      if (error.error && error.error.message) {
        errorMessage += `: ${error.error.message}`;
      } else if (error.statusText) {
        errorMessage += `: ${error.statusText}`;
      } else {
        errorMessage += `: ${error.message || 'Unknown error'}`;
      }
      
      return throwError(() => new Error(errorMessage));
    };
  }
}