import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-floating-window',
  templateUrl: './floating-window.component.html',
  styleUrls: ['./floating-window.component.css']
})
export class FloatingWindowComponent {
  private visibleComponent = new BehaviorSubject<string | null>(null);
  visibleComponent$ = this.visibleComponent.asObservable();

  open(componentName: string) {
    this.visibleComponent.next(componentName);
  }

  close() {
    this.visibleComponent.next(null);
  }
}