import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  isLoading: boolean = true;
  darkMode: boolean = false;

  ngOnInit(): void {
    // Check for dark mode setting
    const savedMode = localStorage.getItem('darkMode');
    this.darkMode = savedMode === 'true';
    if (this.darkMode) {
      document.body.classList.add('dark-mode');
    }

    // Check if the loading screen has been shown before
    const loadingScreenShown = localStorage.getItem('loadingScreenShown');
    if (!loadingScreenShown) {
      // Show the loading screen and set the flag in local storage
      setTimeout(() => {
        this.isLoading = false;
        localStorage.setItem('loadingScreenShown', 'true');
      }, 4000); // Show the loading screen for 4 seconds
    } else {
      // Skip the loading screen
      this.isLoading = false;
    }, 1000); // Show the loading screen for 4 seconds
  }
}