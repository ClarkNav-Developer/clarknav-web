import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SideNavService {
  private sideNavVisible = new BehaviorSubject<boolean>(true);
  sideNavVisible$ = this.sideNavVisible.asObservable();

  showSideNav() {
    this.sideNavVisible.next(true);
  }

  hideSideNav() {
    this.sideNavVisible.next(false);
  }
}