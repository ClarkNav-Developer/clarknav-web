import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FloatingWindowService {
  private visibleComponent = new BehaviorSubject<string | null>(null);
  visibleComponent$ = this.visibleComponent.asObservable();

  open(componentName: string) {
    this.visibleComponent.next(componentName);
  }

  close() {
    this.visibleComponent.next(null);
  }
}
