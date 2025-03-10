import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable, of } from 'rxjs';
import { switchMap, takeUntil, tap, catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../../public/services/user/user.service';
import { RoutesService } from '../../../public/services/routes/routes.service';
import { LocationService } from '../../../public/services/geocoding/location.service';
import { CacheService } from '../../../public/services/caching/caching.service';
import { AuthService } from '../../../auth/auth.service';
import { ChartService } from './chart.service';

import { RouteUsage } from '../../../models/routeusage';
import { LocationSearch } from '../../../models/locationsearch';
import { User } from '../../../models/user';
import { Feedback, FeedbackPriority, FeedbackStatus } from '../../../models/feedback';
import { FareService } from '../../../public/services/fare/fare.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // State management
  activeTab = 'overview';
  isLoading = false;
  error: string | null = null;

  // Modal states
  showUserModal = false;
  showRegisterModal = false;

  // Data storage
  routeUsages: RouteUsage[] = [];
  locationSearches: LocationSearch[] = [];
  users: User[] = [];
  feedbacks: Feedback[] = [];
  filteredUsers: User[] = [];
  selectedFeedback: Feedback | null = null;

  // Form states
  searchTerm = '';
  selectedUser: User | null = null;
  newUser: Partial<User> = this.getInitialUserState();

  fareConfig = {
    jeepney: { baseFare: 13, additionalFare: 1.80 },
    bus: { baseFare: 15, additionalFare: 2.65 },
    taxi: { baseFare: 40, additionalFare: 13.50 }
  };

  constructor(
    private userService: UserService,
    private locationService: LocationService,
    private routesService: RoutesService,
    private toastr: ToastrService,
    private cacheService: CacheService,
    private authService: AuthService,
    private router: Router,
    private chartService: ChartService,
    private fareService: FareService
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
    this.fareConfig = {...this.fareService.getFareConfig()};
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chartService.destroyCharts();
  }

  // Initialization
  private initializeDashboard(): void {
    this.setupDropdownMenu();
    this.loadDashboardData();
    this.loadUsers();
    this.loadFeedbacks();
  }

  // Data loading methods
  private async loadDashboardData(): Promise<void> {
    this.isLoading = true;
    const cacheKey = 'dashboardData';

    try {
      const cachedData = await this.cacheService.get<{
        routeUsages: RouteUsage[],
        locationSearches: LocationSearch[]
      }>(cacheKey).toPromise();

      if (cachedData) {
        this.handleCachedDashboardData(cachedData);
      } else {
        await this.fetchFreshDashboardData(cacheKey);
      }

      this.initializeCharts();
    } catch (error) {
      this.handleDataLoadError('dashboard data', error);
    } finally {
      this.isLoading = false;
    }
  }

  private handleCachedDashboardData(cachedData: {
    routeUsages: RouteUsage[],
    locationSearches: LocationSearch[]
  }): void {
    this.routeUsages = cachedData.routeUsages;
    this.locationSearches = cachedData.locationSearches;
  }

  private async fetchFreshDashboardData(cacheKey: string): Promise<void> {
    const [routeUsages, locationSearches] = await Promise.all([
      this.routesService.getRouteUsages().toPromise(),
      this.locationService.getLocationSearches().toPromise()
    ]);

    this.routeUsages = routeUsages ?? [];
    this.locationSearches = locationSearches ?? [];

    this.cacheService.set(cacheKey, {
      routeUsages: this.routeUsages,
      locationSearches: this.locationSearches
    });
  }

  updateFare(): void {
    // Make a deep copy to ensure we're not dealing with references
    const configToUpdate = JSON.parse(JSON.stringify(this.fareConfig));
    
    this.fareService.updateFareConfig(configToUpdate).subscribe(
      () => {
        alert('Fare configuration updated successfully');
      },
      error => {
        alert('Failed to update fare configuration');
        console.error('Update error:', error);
      }
    );
  }

  private loadUsers(): void {
    const cacheKey = 'users';

    this.cacheService.get<User[]>(cacheKey).pipe(
      switchMap(cachedData => cachedData ? this.handleCachedUsers(cachedData) : this.fetchFreshUsers(cacheKey)),
      takeUntil(this.destroy$)
    ).subscribe({
      error: error => this.handleDataLoadError('users', error)
    });
  }

  private handleCachedUsers(users: User[]): Observable<User[]> {
    this.users = users;
    this.filteredUsers = users;
    return of(users);
  }

  private fetchFreshUsers(cacheKey: string): Observable<User[]> {
    return this.userService.getUsers().pipe(
      tap(users => {
        this.users = users;
        this.filteredUsers = users;
        this.cacheService.set(cacheKey, users);
      })
    );
  }

  private loadFeedbacks(): void {
    const cacheKey = 'feedbacks';

    this.cacheService.get<Feedback[]>(cacheKey).pipe(
      switchMap(cachedData => cachedData ? this.handleCachedFeedbacks(cachedData) : this.fetchFreshFeedbacks(cacheKey)),
      takeUntil(this.destroy$)
    ).subscribe({
      error: error => this.handleDataLoadError('feedbacks', error)
    });
  }

  private handleCachedFeedbacks(feedbacks: Feedback[]): Observable<Feedback[]> {
    this.feedbacks = feedbacks;
    return of(feedbacks);
  }

  private fetchFreshFeedbacks(cacheKey: string): Observable<Feedback[]> {
    return this.userService.getFeedbacks().pipe(
      tap(feedbacks => {
        this.feedbacks = feedbacks;
        this.cacheService.set(cacheKey, feedbacks);
      })
    );
  }

  // UI Event Handlers
  onSearchChange(): void {
    const searchTerm = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.first_name.toLowerCase().includes(searchTerm) ||
      user.last_name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.chartService.destroyCharts();
    setTimeout(() => this.initializeCharts(), 100);
  }

  editUser(user: User): void {
    this.selectedUser = { ...user, password: '', password_confirmation: '' };
    this.showUserModal = true;
  }

  saveUser(): void {
    if (!this.validateUserUpdate()) return;
  
    const userData = this.prepareUserData();
  
    this.userService.updateUser(this.selectedUser!.id!, userData).pipe(
      tap(updatedUser => this.handleUserUpdateSuccess(updatedUser)),
      catchError(error => {
        this.toastr.error('Failed to update user');
        console.error('Update error:', error);
        throw error;
      }),
      finalize(() => this.selectedUser = null)
    ).subscribe();
  }

  private validateUserUpdate(): boolean {
    if (!this.selectedUser?.id) {
      this.toastr.error('Invalid user data');
      return false;
    }

    if (this.selectedUser.password && this.selectedUser.password !== this.selectedUser.password_confirmation) {
      this.toastr.error('Passwords do not match');
      return false;
    }

    return true;
  }

  private prepareUserData(): Partial<User> {
    const userData: Partial<User> = {
      first_name: this.selectedUser!.first_name,
      last_name: this.selectedUser!.last_name,
      email: this.selectedUser!.email,
      isAdmin: this.selectedUser!.isAdmin,
      isUser: this.selectedUser!.isUser
    };

    if (this.selectedUser!.password) {
      userData.password = this.selectedUser!.password;
    }

    return userData;
  }

  private handleUserUpdateSuccess(updatedUser: User): void {
    const index = this.users.findIndex(u => u.id === updatedUser.id);
    if (index > -1) {
      this.users[index] = { ...updatedUser, isAdmin: updatedUser.isAdmin, isUser: updatedUser.isUser };
      this.filteredUsers = [...this.users];
    }
    this.toastr.success('User updated successfully');
  }

  deleteUser(id: number): void {
    if (!this.validateUserDeletion(id)) return;

    this.userService.deleteUser(id).pipe(
      tap(() => this.handleUserDeletionSuccess(id)),
      catchError(error => {
        this.toastr.error('Failed to delete user');
        console.error('Delete error:', error);
        throw error;
      })
    ).subscribe();
  }

  private validateUserDeletion(id: number): boolean {
    if (!id) {
      this.toastr.error('Invalid user ID');
      return false;
    }

    return confirm('Are you sure you want to delete this user?');
  }

  private handleUserDeletionSuccess(id: number): void {
    this.users = this.users.filter(user => user.id !== id);
    this.filteredUsers = [...this.users];
    this.toastr.success('User deleted successfully');
  }

  registerUser(): void {
    if (!this.validateRegistration()) return;

    const registrationData = this.prepareRegistrationData();

    this.authService.register(registrationData).pipe(
      tap(() => this.handleRegistrationSuccess()),
      catchError(error => {
        this.toastr.error('Registration failed: ' + (error.error.message || 'Please try again.'));
        throw error;
      })
    ).subscribe();
  }

  private validateRegistration(): boolean {
    if (!this.newUser?.first_name || !this.newUser?.last_name ||
      !this.newUser?.email || !this.newUser?.password ||
      !this.newUser?.password_confirmation) {
      this.toastr.error('Please fill in all required fields.');
      return false;
    }

    if (this.newUser.password !== this.newUser.password_confirmation) {
      this.toastr.error('Passwords do not match.');
      return false;
    }

    return true;
  }

  private prepareRegistrationData(): any {
    return {
      ...this.newUser,
      password_confirmation: this.newUser.password_confirmation
    };
  }

  private handleRegistrationSuccess(): void {
    this.toastr.success('User registered successfully');
    this.newUser = this.getInitialUserState();
    this.showRegisterModal = false;
    this.loadUsers();
  }

  onRoleChange(userType: 'newUser' | 'selectedUser'): void {
    if (!this[userType]) return;
  
    if (this[userType]!.role === 'admin') {
      this[userType]!.isAdmin = true;
      this[userType]!.isUser = false;
    } else {
      this[userType]!.isAdmin = false;
      this[userType]!.isUser = true;
    }
  }
  

  logout(event: Event): void {
    event.preventDefault();

    this.authService.logout().pipe(
      tap(() => {
        this.toastr.success('Logged out successfully');
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        this.toastr.error('Logout error');
        console.error('Logout error:', error);
        throw error;
      })
    ).subscribe();
  }

  private setupDropdownMenu(): void {
    const navButton = document.getElementById('navButton');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!navButton || !dropdownMenu) {
      console.error('Nav button or dropdown menu not found');
      return;
    }

    navButton.addEventListener('click', function () {
      this.parentElement?.classList.toggle('show');
    });

    document.addEventListener('click', function (event) {
      const nav = document.querySelector('.nav');
      if (nav && !nav.contains(event.target as Node)) {
        nav.classList.remove('show');
      }
    });
  }

  private initializeCharts(): void {
    this.chartService.initializeCharts(
      this.activeTab,
      this.routeUsages,
      this.locationSearches
    );
  }

  private handleDataLoadError(dataType: string, error: any): void {
    this.toastr.error(`Failed to load ${dataType}`);
    console.error(`Error fetching ${dataType}:`, error);
    this.isLoading = false;
  }

  updateFeedback(): void {
    if (!this.selectedFeedback) return;

    this.userService.updateFeedback(this.selectedFeedback).pipe(
      tap(() => {
        this.toastr.success('Feedback updated successfully');
        this.closeFeedbackModal();
      }),
      catchError(error => {
        this.toastr.error('Failed to update feedback');
        console.error('Update error:', error);
        throw error;
      })
    ).subscribe();
  }

  getFeedbackPriorities(): string[] {
    return Object.values(FeedbackPriority);
  }

  getFeedbackStatuses(): string[] {
    return Object.values(FeedbackStatus);
  }

  viewFeedbackDetails(feedback: Feedback): void {
    this.selectedFeedback = feedback;
  }

  closeFeedbackModal(): void {
    this.selectedFeedback = null;
  }

  private getInitialUserState(): Partial<User> {
    return {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirmation: '',
      isAdmin: false,
      isUser: true
    };
  }
}