import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  ngOnInit() {
    this.createPopularLocationChart();
    this.createMostSearchLocationChart();
    this.setupDropdownMenu();
  }

  createPopularLocationChart() {
    Chart.register(...registerables);
    const canvas = document.getElementById('popularLocationChart') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [{
              label: 'Popular Locations',
              data: [65, 59, 80, 81, 56, 55, 40],
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      } else {
        console.error('Failed to get 2D context');
      }
    } else {
      console.error('Canvas element not found');
    }
  }

  createMostSearchLocationChart() {
    Chart.register(...registerables);
    const canvas = document.getElementById('mostSearchLocationChart') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [{
              label: 'Most Searched Locations',
              data: [28, 48, 40, 19, 86, 27, 90],
              backgroundColor: 'rgba(153, 102, 255, 0.2)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      } else {
        console.error('Failed to get 2D context');
      }
    } else {
      console.error('Canvas element not found');
    }
  }

  setupDropdownMenu() {
    const navButton = document.getElementById('navButton');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (navButton && dropdownMenu) {
      navButton.addEventListener('click', () => {
        console.log('Nav button clicked');
        dropdownMenu.classList.toggle('show');
        console.log('Dropdown menu class list:', dropdownMenu.classList);
      });

      window.addEventListener('click', (event) => {
        if (!(event.target as Element).matches('#navButton')) {
          if (dropdownMenu.classList.contains('show')) {
            dropdownMenu.classList.remove('show');
            console.log('Dropdown menu hidden');
          }
        }
      });
    } else {
      console.error('Nav button or dropdown menu not found');
    }
  }
}