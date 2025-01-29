import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FloatingWindowService } from '../../../floating-window.service';
import { MapStyleService } from '../../services/map/map-style.service';
import { MapInstanceService } from '../../services/map/map-instance.service';
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  selectedMenuItem: string = 'account-settings';
  darkMode: boolean = false;
  showMenuContent: boolean = true; // New state to track menu content visibility

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

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private floatingWindowService: FloatingWindowService,
    private mapStyleService: MapStyleService,
    private mapInstanceService: MapInstanceService
  ) {
    const savedMode = localStorage.getItem('darkMode');
    this.darkMode = savedMode === 'true';
  }

  ngOnInit() {
    const savedMode = localStorage.getItem('darkMode');
    this.darkMode = savedMode === 'true';
    if (this.darkMode) {
      document.body.classList.add('dark-mode');
      this.mapStyleService.loadMapStyle('assets/darkmap.json').subscribe(style => {
        this.mapInstanceService.setMapStyle(style);
      });
    }

    // Load current user details
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.firstName = currentUser.first_name;
      this.lastName = currentUser.last_name;
      this.email = currentUser.email;
    }
  }

  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }

  selectMenuItem(menuItem: string) {
    this.selectedMenuItem = menuItem;
    this.showMenuContent = false; // Hide menu content when a menu item is selected
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

  // New method to handle back button click
  showMenu() {
    this.showMenuContent = true;
  }

  logout(event: Event) {
    event.preventDefault(); // Prevent the default link behavior
    this.authService.logout().subscribe(
      response => {
        console.log('Logged out successfully');
        this.router.navigate(['/admin/login']);
      },
      error => {
        console.error('Logout error:', error);
      }
    );
  }

  updateCredentials(event: Event) {
    event.preventDefault();
    const updatedCredentials = {
      first_name: this.firstName,
      last_name: this.lastName,
      current_password: this.currentPassword,
      new_password: this.newPassword,
      new_password_confirmation: this.newPasswordConfirmation,
    };
    this.authService.updateCredentials(updatedCredentials).subscribe(
      response => {
        if (response) {
          console.log('Credentials updated successfully');
          alert('Credentials updated successfully');
        } else {
          console.error('Failed to update credentials');
          alert('Failed to update credentials');
        }
      },
      error => {
        console.error('Error updating credentials:', error);
        alert('Error updating credentials');
      }
    );
  }

  onSubmitBugReport(event: Event) {
    event.preventDefault();
    const formData = new FormData();
    for (const key in this.bugReport) {
      if (this.bugReport.hasOwnProperty(key)) {
        formData.append(key, this.bugReport[key]);
      }
    }
    this.http.post(`${environment.apiUrl}/api/bug-reports`, formData).subscribe(
      response => {
        console.log('Bug report submitted successfully', response);
        alert('Bug report submitted successfully');
      },
      error => {
        console.error('Error submitting bug report', error);
        alert('Error submitting bug report');
      }
    );
  }

  onSubmitFeedback(event: Event) {
    event.preventDefault();
    this.http.post(`${environment.apiUrl}/api/feedback`, this.feedback).subscribe(
      response => {
        console.log('Feedback submitted successfully', response);
        alert('Feedback submitted successfully');
      },
      error => {
        console.error('Error submitting feedback', error);
        alert('Error submitting feedback');
      }
    );
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.bugReport.screenshots = input.files[0];
    }
  }
}