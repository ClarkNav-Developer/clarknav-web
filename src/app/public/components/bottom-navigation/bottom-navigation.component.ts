import { Component } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';
import { NavigationService } from '../../services/navigation/navigation.service';

@Component({
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.css']
})
export class BottomNavigationComponent {
  isNavigationActive: boolean = false;

  constructor(
    public floatingWindowService: FloatingWindowService,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.navigationService.isNavigationActive$.subscribe(isActive => {
      this.isNavigationActive = isActive;
    });
  }

  openPlannerComponent() {
    this.floatingWindowService.open('planner');
  }

  openRouteComponent() {
    if (this.isNavigationActive) {
      toastr.warning('Routes is disabled during navigation.');
    } else {
      this.floatingWindowService.open('route');
    }
  }

  openAccountComponent() {
    const isMobile = window.innerWidth <= 767;
    if (isMobile) {
      this.floatingWindowService.open('account-mobile');
    } else {
      this.floatingWindowService.open('account-desktop');
    }
  }
}