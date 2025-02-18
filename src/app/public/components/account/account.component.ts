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
import { User } from '../../../models/user';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  selectedMenuItem: string = 'account-settings';
  darkMode: boolean = false;
  showMenuContent: boolean = true;

  firstName: string = '';
  lastName: string = '';
  email: string = '';
  currentPassword: string = '';
  newPassword: string = '';
  newPasswordConfirmation: string = '';

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

  feedbackCategories = ['FEATURE_SUGGESTION', 'USABILITY_ISSUE', 'APP_PERFORMANCE', 'ROUTE_ACCURACY', 'GENERAL_EXPERIENCE', 'ADDITIONAL_SUGGESTIONS'];
  feedbackPriorities = ['LOW', 'MEDIUM', 'HIGH'];
  feedbackStatuses = ['UNDER_REVIEW', 'IN_PROGRESS', 'IMPLEMENTED', 'CLOSED'];

  navigationHistories: any[] = [];
  isLoggedIn: boolean = false;
  private historiesFetched: boolean = false;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private floatingWindowService: FloatingWindowService,
    private mapStyleService: MapStyleService,
    private mapInstanceService: MapInstanceService,
    private suggestedRoutesService: SuggestedRoutesService,
    private mapService: MapService,
    private googleMapsLoader: GoogleMapsLoaderService
  ) {
    const savedMode = localStorage.getItem('darkMode');
    this.darkMode = savedMode === 'true';
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

      this.checkAuthentication();
    }).catch(error => {
      console.error('Error loading Google Maps API:', error);
    });
  }

  private checkAuthentication(): void {
    this.authService.isAuthenticated.subscribe(isAuthenticated => {
      console.log('Is Authenticated:', isAuthenticated); // Debugging: Check authentication state
      this.isLoggedIn = isAuthenticated;
      if (isAuthenticated) {
        this.authService.currentUser.subscribe(user => {
          if (user) {
            this.firstName = user.first_name;
            this.lastName = user.last_name;
            this.email = user.email;
            this.fetchNavigationHistories();
          }
        });
      }
    });
  }

  private fetchNavigationHistories(): void {
    if (!this.isLoggedIn || this.historiesFetched) {
      return;
    }

    this.http.get(environment.navigationHistories.getNavigationHistories, { withCredentials: true }).subscribe({
      next: (response) => {
        this.navigationHistories = response as any[];
        this.historiesFetched = true;
        console.log('Navigation histories fetched successfully:', this.navigationHistories);
      },
      error: (error) => {
        console.error('Error fetching navigation histories:', error);
        if (error.status === 403) {
          console.error('User is not authorized to access navigation histories.');
          this.router.navigate(['/unauthorized']); // Redirect to unauthorized page
        } else {
          alert('Failed to fetch navigation histories.');
        }
      }
    });
  }

  viewRoute(history: any) {
    console.log('Viewing route with the following details:', history);
    this.mapService.clearMap();

    this.mapService.displayRouteSegments({ path: history.route_details.path, color: history.route_details.color });

    const startWaypoint = history.route_details.path[0];
    const endWaypoint = history.route_details.path[history.route_details.path.length - 1];
    this.mapService.displayWalkingPath(startWaypoint, startWaypoint, history.route_details.color);
    this.mapService.displayWalkingPath(endWaypoint, endWaypoint, history.route_details.color);

    this.mapService.map.setCenter(startWaypoint);
  }

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }

  selectMenuItem(menuItem: string) {
    this.selectedMenuItem = menuItem;
    this.showMenuContent = false;
  }

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

  showMenu() {
    this.showMenuContent = true;
  }

  logout(event: Event): void {
    event.preventDefault();

    this.authService.logout().subscribe({
        next: () => {
            // Clear cookies on the client side
            document.cookie = 'XSRF-TOKEN=; Path=/; Domain=localhost; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = 'laravel_session=; Path=/; Domain=localhost; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            this.router.navigate(['/login']);
        },
        error: (error) => {
            console.error('Logout error:', error);
        }
    });
}

  onSubmitFeedback(event: Event) {
    event.preventDefault();
    this.http.post(environment.feedback.storeFeedback, this.feedback, { withCredentials: true }).subscribe({
      next: (response) => {
        console.log('Feedback submitted successfully', response);
        alert('Feedback submitted successfully');
      },
      error: (error) => {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback');
      }
    });
  }

  updateCredentials(event: Event) {
    event.preventDefault();
    if (this.newPassword !== this.newPasswordConfirmation) {
      alert('New password and confirmation do not match.');
      return;
    }

    const updatedUser: Partial<User> = {
      first_name: this.firstName,
      last_name: this.lastName,
      email: this.email,
      password: this.newPassword,
      password_confirmation: this.newPasswordConfirmation
    };

    this.authService.updateUser(updatedUser).subscribe({
      next: (response) => {
        console.log('User credentials updated successfully:', response);
        alert('User credentials updated successfully.');
        this.currentPassword = '';
        this.newPassword = '';
        this.newPasswordConfirmation = '';
      },
      error: (error) => {
        console.error('Error updating user credentials:', error);
        alert('Failed to update user credentials.');
      }
    });
  }
}