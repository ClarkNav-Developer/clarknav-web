import { Component, OnInit, OnDestroy } from '@angular/core';
import { of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { UserService } from '../../../public/services/user/user.service';
import { RoutesService } from '../../../public/services/routes/routes.service';
import { LocationService } from '../../../public/services/geocoding/location.service';
import { RouteUsage } from '../../../models/routeusage';
import { LocationSearch } from '../../../models/locationsearch';
import { User } from '../../../models/user';
import { ToastrService } from 'ngx-toastr';
import { CacheService } from '../../../public/services/caching/caching.service';
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';
import { ChartService } from './chart.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activeTab = 'overview';
  isLoading = true;
  error: string | null = null;
  showUserModal = false;
  searchTerm = '';

  routeUsages: RouteUsage[] = [];
  locationSearches: LocationSearch[] = [];
  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;

  constructor(
    private userService: UserService,
    private locationService: LocationService,
    private routesService: RoutesService,
    private toastr: ToastrService,
    private cacheService: CacheService,
    private authService: AuthService,
    private router: Router,
    private chartService: ChartService // Add this line
  ) { }

  ngOnInit(): void {
    this.setupDropdownMenu();
    this.fetchDashboardData();
    this.fetchUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chartService.destroyCharts(); // Use ChartService to destroy charts
  }

  onSearchChange(): void {
    this.filteredUsers = this.users.filter(user =>
      user.first_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Update the switchTab method
  switchTab(tab: string): void {
    this.activeTab = tab;
    this.chartService.destroyCharts();

    // Use Angular's change detection to ensure DOM updates
    setTimeout(() => {
      this.chartService.initializeCharts(
        this.activeTab,
        this.routeUsages,
        this.locationSearches
      );
    }, 100); // Small delay to ensure DOM render
  }

  async fetchDashboardData(): Promise<void> {
    try {
      this.isLoading = true;
      const cacheKey = 'dashboardData';
      const cachedData = await this.cacheService.get<{ routeUsages: RouteUsage[], locationSearches: LocationSearch[] }>(cacheKey).toPromise();

      if (cachedData) {
        console.log('Using cached dashboard data');
        this.routeUsages = cachedData.routeUsages;
        this.locationSearches = cachedData.locationSearches;
        console.log('Dashboard data loaded from cache');
      } else {
        console.log('Fetching dashboard data from server');
        const [routeUsages, locationSearches] = await Promise.all([
          this.routesService.getRouteUsages().toPromise(),
          this.locationService.getLocationSearches().toPromise()
        ]);

        this.routeUsages = routeUsages ?? [];
        this.locationSearches = locationSearches ?? [];
        this.cacheService.set(cacheKey, { routeUsages: this.routeUsages, locationSearches: this.locationSearches });
      }

      this.chartService.initializeCharts(this.activeTab, this.routeUsages, this.locationSearches); // Use ChartService to initialize charts
    } catch (error) {
      this.toastr.error('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  fetchUsers(): void {
    const cacheKey = 'users';
    this.cacheService.get<User[]>(cacheKey).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          console.log('Using cached user data');
          this.users = cachedData;
          this.filteredUsers = cachedData;
          this.isLoading = false;
          console.log('User data loaded from cache');
          return of(cachedData);
        } else {
          console.log('Fetching user data from server');
          return this.userService.getUsers().pipe(
            tap(users => {
              this.users = users;
              this.filteredUsers = users;
              this.cacheService.set(cacheKey, users);
              this.isLoading = false;
            })
          );
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => {
        this.toastr.error('Failed to load users');
        console.error('Error fetching users:', error);
        this.isLoading = false;
      }
    });
  }

  editUser(user: User): void {
    this.selectedUser = { ...user, password: '', passwordConfirmation: '' };
    this.showUserModal = true;
  }

  // dashboard.component.ts
  saveUser(): void {
    if (!this.selectedUser?.id) {
      this.toastr.error('Invalid user data');
      return;
    }

    if (this.selectedUser.password !== this.selectedUser.passwordConfirmation) {
      this.toastr.error('Passwords do not match');
      return;
    }

    // Map to backend-compatible format
    const userData = {
      first_name: this.selectedUser.first_name,
      last_name: this.selectedUser.last_name,
      email: this.selectedUser.email,
      is_admin: this.selectedUser.isAdmin,
      is_user: this.selectedUser.isUser,
      ...(this.selectedUser.password && { password: this.selectedUser.password })
    };

    this.userService.updateUser(this.selectedUser.id, userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          // Update local state
          const index = this.users.findIndex(u => u.id === updatedUser.id);
          if (index > -1) {
            this.users[index] = {
              ...updatedUser,
              // Map backend response to frontend format
              isAdmin: updatedUser.isAdmin,
              isUser: updatedUser.isUser
            };
            this.filteredUsers = [...this.users];
          }
          this.toastr.success('User updated successfully');
          this.selectedUser = null;
          this.cacheService.clear('users');
        },
        error: (error) => {
          this.toastr.error('Failed to update user');
          console.error('Update error:', error);
        }
      });
  }

  deleteUser(userId: number): void {
    if (!userId) {
      this.toastr.error('Invalid user ID');
      return;
    }

    this.userService.deleteUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.users = this.users.filter(user => user.id !== userId);
          this.filteredUsers = [...this.users];
          this.toastr.success('User deleted successfully');
          this.cacheService.clear('users');
        },
        error: (error) => {
          this.toastr.error('Failed to delete user');
          console.error('Delete error:', error);
        }
      });
  }

  toggleUserRole(role: 'isAdmin' | 'isUser'): void {
    if (!this.selectedUser) return;

    if (role === 'isAdmin') {
      // If setting as admin, remove user role
      if (this.selectedUser.isAdmin) {
        this.selectedUser.isUser = false;
      }
    } else if (role === 'isUser') {
      // If setting as regular user, remove admin role
      if (this.selectedUser.isUser) {
        this.selectedUser.isAdmin = false;
      }
    }
  }

  setupDropdownMenu() {
    const navButton = document.getElementById('navButton');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (navButton && dropdownMenu) {
      navButton.addEventListener('click', function () {
        if (this.parentElement) {
          this.parentElement.classList.toggle('show');
        } else {
          console.error('Parent element not found');
        }
      });

      document.addEventListener('click', function (event) {
        const nav = document.querySelector('.nav');
        const navButton = document.getElementById('navButton');

        if (nav && !nav.contains(event.target as Node)) {
          nav.classList.remove('show');
        }
      });
    } else {
      console.error('Nav button or dropdown menu not found');
    }
  }

  logout(event: Event) {
    event.preventDefault(); // Prevent the default link behavior
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
        this.toastr.success('Logged out successfully');
        this.router.navigate(['/login']); // Redirect to /login
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.toastr.error('Logout error');
      }
    });
  }
}