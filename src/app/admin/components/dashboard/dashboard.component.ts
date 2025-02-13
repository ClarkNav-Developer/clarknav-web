import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../../public/services/user/user.service';
import { RoutesService } from '../../../public/services/routes/routes.service';
import { LocationService } from '../../../public/services/geocoding/location.service';
import { RouteUsage } from '../../../models/routeusage';
import { LocationSearch } from '../../../models/locationsearch';
import { User } from '../../../models/user';
import { ToastrService } from 'ngx-toastr';

interface ChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    borderRadius?: number;
    tension?: number;
  }[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private charts: Map<string, Chart> = new Map();
  
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
    private toastr: ToastrService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.setupDropdownMenu();
    this.initializeCharts();
    this.fetchDashboardData();
    this.fetchUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  onSearchChange(): void {
    this.filteredUsers = this.users.filter(user => 
      user.first_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.destroyCharts();
    setTimeout(() => this.initializeCharts(), 0);
  }

  async fetchDashboardData(): Promise<void> {
    try {
      this.isLoading = true;
      const [routeUsages, locationSearches] = await Promise.all([
        this.routesService.getRouteUsages().toPromise(),
        this.locationService.getLocationSearches().toPromise()
      ]);
      
      this.routeUsages = routeUsages ?? [];
      this.locationSearches = locationSearches ?? [];
      this.initializeCharts();
    } catch (error) {
      this.toastr.error('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  fetchUsers(): void {
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.filteredUsers = users;
          this.isLoading = false;
        },
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

  saveUser(): void {
    if (!this.selectedUser) return;

    if (this.selectedUser.password !== this.selectedUser.passwordConfirmation) {
      this.toastr.error('Passwords do not match');
      return;
    }

    const userData = {
      ...this.selectedUser,
      ...(this.selectedUser.password ? { password: this.selectedUser.password } : {})
    };
    delete userData.passwordConfirmation;

    this.userService.updateUser(userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === updatedUser.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
            this.filteredUsers = [...this.users];
          }
          this.toastr.success('User updated successfully');
        },
        error: (error) => {
          this.toastr.error('Failed to update user');
          console.error('Error updating user:', error);
        }
      });
  }

  deleteUser(userId: number): void {
    if (!confirm('Are you sure you want to delete this user?')) return;

    this.userService.deleteUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.users = this.users.filter(user => user.id !== userId);
          this.filteredUsers = [...this.users];
          this.toastr.success('User deleted successfully');
        },
        error: (error) => {
          this.toastr.error('Failed to delete user');
          console.error('Error deleting user:', error);
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
      navButton.addEventListener('click', function() {
        if (this.parentElement) {
          this.parentElement.classList.toggle('show');
        } else {
          console.error('Parent element not found');
        }
      });

      document.addEventListener('click', function(event) {
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

  private initializeCharts(): void {
    if (this.activeTab === 'overview' || this.activeTab === 'all') {
      this.initializeTransportTypeChart();
      this.initializePopularRoutesChart();
    }
    if (this.activeTab === 'trends' || this.activeTab === 'all') {
      this.initializeRouteUsageTrendsChart();
    }
    if (this.activeTab === 'locations' || this.activeTab === 'all') {
      this.initializeOriginChart();
      this.initializeDestinationChart();
    }
  }

  private initializeTransportTypeChart(): void {
    const transportTypes = this.processTransportTypeData();
    const chartConfig = this.getTransportTypeChartConfig(transportTypes);
    this.createOrUpdateChart('transportType', 'pie', chartConfig);
  }

  private initializePopularRoutesChart(): void {
    const popularRoutes = this.processPopularRoutesData();
    const chartConfig = this.getPopularRoutesChartConfig(popularRoutes);
    this.createOrUpdateChart('popularRoutes', 'bar', chartConfig);
  }

  private initializeRouteUsageTrendsChart(): void {
    const trends = this.processRouteUsageTrendsData();
    const chartConfig = this.getRouteUsageTrendsChartConfig(trends);
    this.createOrUpdateChart('routeUsageTrends', 'line', chartConfig);
  }

  private initializeOriginChart(): void {
    const originData = this.processLocationData('origin');
    const chartConfig = this.getOriginChartConfig(originData);
    this.createOrUpdateChart('originChart', 'doughnut', chartConfig);
  }

  private initializeDestinationChart(): void {
    const destinationData = this.processLocationData('destination');
    const chartConfig = this.getDestinationChartConfig(destinationData);
    this.createOrUpdateChart('destinationChart', 'bar', chartConfig);
  }

  private processTransportTypeData() {
    return this.routeUsages.reduce((acc: { [key: string]: number }, usage) => {
      const type = usage.route_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  private processPopularRoutesData() {
    const routeCounts = this.routeUsages.reduce((acc: { [key: string]: number }, usage) => {
      acc[usage.route_name] = (acc[usage.route_name] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(routeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }

  private processRouteUsageTrendsData() {
    const monthlyData = this.routeUsages.reduce((acc: { [key: string]: number }, usage) => {
      const date = new Date(usage.created_at);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b));
  }

  private processLocationData(type: 'origin' | 'destination') {
    const locationCounts = this.locationSearches.reduce((acc: { [key: string]: number }, search) => {
      const location = search[type];
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }

  private getTransportTypeChartConfig(data: any): ChartConfiguration {
    return {
      type: 'pie',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(255, 99, 132, 0.8)'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 12 } }
          },
          title: {
            display: true,
            text: 'Transport Type Distribution',
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    };
  }

  private getPopularRoutesChartConfig(data: [string, number][]): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: data.map(([name]) => name),
        datasets: [{
          label: 'Usage Count',
          data: data.map(([, count]) => count),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Most Popular Routes',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { display: true }
          }
        }
      }
    };
  }

  private getRouteUsageTrendsChartConfig(data: [string, number][]): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: data.map(([date]) => date),
        datasets: [{
          label: 'Monthly Usage',
          data: data.map(([, count]) => count),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Route Usage Trends',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: { beginAtZero: true },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45 }
          }
        }
      }
    };
  }

  private getOriginChartConfig(data: [string, number][]): ChartConfiguration {
    return {
      type: 'doughnut',
      data: {
        labels: data.map(([location]) => location),
        datasets: [{
          data: data.map(([, count]) => count),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)', // blue
            'rgba(16, 185, 129, 0.8)', // green
            'rgba(245, 158, 11, 0.8)', // amber
            'rgba(239, 68, 68, 0.8)',  // red
            'rgba(139, 92, 246, 0.8)', // purple
            'rgba(14, 165, 233, 0.8)'  // sky
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 12
              },
              padding: 20
            }
          },
          title: {
            display: false
          }
        }
      }
    };
  }

  private getDestinationChartConfig(data: [string, number][]): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: data.map(([location]) => location),
        datasets: [{
          label: 'Number of Searches',
          data: data.map(([, count]) => count),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: true
            },
            ticks: {
              font: {
                size: 12
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 12
              }
            }
          }
        }
      }
    };
  }

  private createOrUpdateChart(id: string, type: ChartType, config: ChartConfiguration): void {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;

    const existingChart = this.charts.get(id);
    if (existingChart) {
      existingChart.destroy();
    }

    const chart = new Chart(canvas, config);
    this.charts.set(id, chart);
  }

  private destroyCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }
}