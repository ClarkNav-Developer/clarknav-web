import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FloatingWindowService {
  private isVisible = new BehaviorSubject<boolean>(false);
  isVisible$ = this.isVisible.asObservable();

  open() {
    this.isVisible.next(true);
  }

  close() {
    this.isVisible.next(false);
  }
}
