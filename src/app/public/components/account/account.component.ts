import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FloatingWindowService } from '../../../floating-window.service';
import { MapStyleService } from '../../services/map/map-style.service';
import { MapInstanceService } from '../../services/map/map-instance.service';
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SuggestedRoutesService } from '../../services/routes/suggested-routes.service';
import { MapService } from '../../services/map/map.service';
import { GoogleMapsLoaderService } from '../../services/geocoding/google-maps-loader.service';
import { NavigationService } from '../../services/navigation/navigation.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  selectedMenuItem: string = 'account-settings';
  darkMode: boolean = false;
  showMenuContent: boolean = true; // New state to track menu content visibility
  showHistoryBar: boolean = false; // New state to track history bar visibility

  firstName: string = '';
  lastName: string = '';
  email: string = '';
  currentPassword: string = '';
  newPassword: string = '';
  newPasswordConfirmation: string = '';

  bugReport: any = {
    title: '',
    category: '',
    description: '',
    steps: '',
    expected: '',
    actual: '',
    device: '',
    frequency: '',
    screenshots: null
  };
  feedback: any = {
    title: '',
    feature: '',
    usability: '',
    performance: '',
    experience: '',
    suggestions: '',
    priority: 'LOW',
    status: 'UNDER_REVIEW'
  };

  bugPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  bugStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  deviceOSOptions = ['ANDROID', 'IOS', 'WINDOWS', 'MACOS', 'LINUX', 'OTHER'];
  browserOptions = ['CHROME', 'SAFARI', 'FIREFOX', 'EDGE', 'OPERA', 'OTHER'];

  feedbackCategories = ['FEATURE_SUGGESTION', 'USABILITY_ISSUE', 'APP_PERFORMANCE', 'ROUTE_ACCURACY', 'GENERAL_EXPERIENCE', 'ADDITIONAL_SUGGESTIONS'];
  feedbackPriorities = ['LOW', 'MEDIUM', 'HIGH'];
  feedbackStatuses = ['UNDER_REVIEW', 'IN_PROGRESS', 'IMPLEMENTED', 'CLOSED'];

  navigationHistories: any[] = [];
  isLoggedIn: boolean = false;
  isNavigationActive: boolean = false;
  private historiesFetched: boolean = false; // Flag to track if histories have been fetched

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private floatingWindowService: FloatingWindowService,
    private mapStyleService: MapStyleService,
    private mapInstanceService: MapInstanceService,
    private suggestedRoutesService: SuggestedRoutesService,
    private mapService: MapService,
    private googleMapsLoader: GoogleMapsLoaderService,
    private navigationService: NavigationService
  ) {
    const savedMode = localStorage.getItem('darkMode');
    this.darkMode = savedMode === 'true';
    this.navigationService.isNavigationActive$.subscribe(isActive => {
      this.isNavigationActive = isActive;
    });
  }

  ngOnInit() {
    this.googleMapsLoader.load().then(() => {
      const savedMode = localStorage.getItem('darkMode');
      this.darkMode = savedMode === 'true';
      if (this.darkMode) {
        document.body.classList.add('dark-mode');
        this.mapStyleService.loadMapStyle('assets/darkmap.json').subscribe(style => {
          this.mapInstanceService.setMapStyle(style);
        });
      }

      if (!this.authService.isAuthenticated) {
        this.authService.getIdentity().subscribe({
          next: (isAuthenticated) => {
            this.isLoggedIn = isAuthenticated;
            if (isAuthenticated) {
              const currentUser = this.authService.getCurrentUser();
              if (currentUser) {
                this.firstName = currentUser.first_name;
                this.lastName = currentUser.last_name;
                this.email = currentUser.email;
              }
              this.fetchNavigationHistories();
            }
          },
          error: (error) => {
            console.error('Error fetching user identity:', error);
          }
        });
      } else {
        this.isLoggedIn = true;
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          this.firstName = currentUser.first_name;
          this.lastName = currentUser.last_name;
          this.email = currentUser.email;
        }
        this.fetchNavigationHistories();
      }
    }).catch(error => {
      console.error('Error loading Google Maps API:', error);
    });
  }

  fetchNavigationHistories() {
    if (this.historiesFetched) {
      return;
    }
  
    this.http.get(environment.navigationHistoriesUrl).subscribe({
      next: (response) => {
        this.navigationHistories = (response as any[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.historiesFetched = true;
        console.debug('Navigation histories fetched successfully:', this.navigationHistories);
      },
      error: (error) => {
        console.error('Error fetching navigation histories:', error);
      }
    });
  }

  // History Controls
  onHistoryButtonClick(event: Event) {
    if (this.isNavigationActive) {
      event.preventDefault();
      toastr.warning('Viewing of History is disabled during navigation.');
    } else {
      this.selectMenuItem('history-mobile');
    }
  }

  viewRoute(history: any) {
    console.debug('Viewing route with the following details:', history);
    this.mapService.clearMap(); // Clear any existing routes on the map

    // Render the route on the map
    this.mapService.displayRouteSegments({ path: history.route_details.path, color: history.route_details.color });

    // Ensure walking paths are displayed for the selected route
    const startWaypoint = history.route_details.path[0];
    const endWaypoint = history.route_details.path[history.route_details.path.length - 1];
    this.mapService.displayWalkingPath(startWaypoint, startWaypoint, history.route_details.color);
    this.mapService.displayWalkingPath(endWaypoint, endWaypoint, history.route_details.color);

    // Center the map on the route
    this.mapService.map.setCenter(startWaypoint);

    // Hide the floating window and show the history bar
    this.showHistoryBar = true;
  }

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }

  selectMenuItem(menuItem: string) {
    this.selectedMenuItem = menuItem;
    this.showMenuContent = false; // Hide menu content when a menu item is selected
  }

  // Dark Mode Toggle
  toggleDarkMode(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.darkMode = isChecked;
    localStorage.setItem('darkMode', String(isChecked));
    if (isChecked) {
      document.body.classList.add('dark-mode');
      this.mapStyleService.loadMapStyle('assets/darkmap.json').subscribe(style => {
        this.mapInstanceService.setMapStyle(style);
      });
    } else {
      document.body.classList.remove('dark-mode');
      this.mapStyleService.loadMapStyle('assets/retro.json').subscribe(style => {
        this.mapInstanceService.setMapStyle(style);
      });
    }
  }

  // New method to handle back button click
  showMenu() {
    this.showMenuContent = true;
  }

  // New method to handle closing the history bar
  closeHistoryBar() {
    this.showHistoryBar = false;
    this.mapService.clearMap();
  }

  // Logout Method
  logout(event: Event) {
    event.preventDefault(); // Prevent the default link behavior
    this.authService.logout().subscribe({
      next: () => {
        console.debug('Logged out successfully');
        this.router.navigate(['/login']); // Redirect to /login
      },
      error: (error) => {
        console.error('Logout error:', error);
      }
    });
  }

  // Credentials Controls
  updateCredentials(event: Event) {
    event.preventDefault();
    const updatedCredentials: {
      first_name: string;
      last_name: string;
      current_password?: string;
      new_password?: string;
      new_password_confirmation?: string;
    } = {
      first_name: this.firstName,
      last_name: this.lastName,
    };
  
    // Only include password fields if new password is provided
    if (this.newPassword) {
      updatedCredentials.current_password = this.currentPassword;
      updatedCredentials.new_password = this.newPassword;
      updatedCredentials.new_password_confirmation = this.newPasswordConfirmation;
    }
  
    this.authService.updateCredentials(updatedCredentials).subscribe({
      next: (response) => {
        if (response) {
          console.debug('Credentials updated successfully');
          toastr.info('Credentials updated successfully');
        } else {
          console.error('Failed to update credentials');
          toastr.info('Failed to update credentials');
        }
      },
      error: (error) => {
        console.error('Error updating credentials:', error);
        toastr.error('Error updating credentials');
      }
    });
  }

  onSubmitBugReport(event: Event) {
    event.preventDefault();
    const formData = new FormData();
    for (const key in this.bugReport) {
      if (this.bugReport.hasOwnProperty(key)) {
        formData.append(key, this.bugReport[key]);
      }
    }
    this.http.post(environment.bugReportsUrl, formData).subscribe({
      next: (response) => {
        console.debug('Bug report submitted successfully', response);
        toastr.success('Bug report submitted successfully');
      },
      error: (error) => {
        console.error('Error submitting bug report', error);
        toastr.error('Error submitting bug report');
      }
    });
  }

  onSubmitFeedback(event: Event) {
    event.preventDefault();
    this.http.post(environment.feedbackUrl, this.feedback).subscribe({
      next: (response) => {
        console.debug('Feedback submitted successfully', response);
        toastr.success('Feedback submitted successfully');
      },
      error: (error) => {
        console.error('Error submitting feedback:', error);
        toastr.error('Error submitting feedback');
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.bugReport.screenshots = input.files[0];
    }
  }
}