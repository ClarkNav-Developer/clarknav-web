import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FloatingWindowService {
  private visibleComponent = new BehaviorSubject<string | null>(null);
  visibleComponent$ = this.visibleComponent.asObservable();

  private data = new BehaviorSubject<any>(null);
  data$ = this.data.asObservable();

  open(componentName: string) {
    this.visibleComponent.next(componentName);
  }

  close() {
    this.visibleComponent.next(null);
  }

  setData(data: any) {
    this.data.next(data);
  }
}