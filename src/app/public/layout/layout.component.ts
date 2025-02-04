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

    // Simulate a loading delay (adjust the time as needed)
    setTimeout(() => {
      this.isLoading = false;
    }, 4000); // Show the loading screen for 4 seconds
  }
}