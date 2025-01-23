import { Component, OnInit } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';
import { MapStyleService } from '../../services/map-style.service';
import { MapInstanceService } from '../../services/map-instance.service';
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  selectedMenuItem: string = 'account-settings';
  darkMode: boolean = false;
  showMenuContent: boolean = true; // New state to track menu content visibility

  constructor(
    private authService: AuthService,
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
}