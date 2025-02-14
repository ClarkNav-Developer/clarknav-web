import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, any>();

  get<T>(key: string): Observable<T | null> {
    const cachedData = this.cache.get(key);
    if (cachedData) {
      console.log(`Cache hit for key: ${key}`);
    } else {
      console.log(`Cache miss for key: ${key}`);
    }
    return of(cachedData || null);
  }

  set<T>(key: string, data: T): void {
    console.log(`Setting cache for key: ${key}`);
    this.cache.set(key, data);
  }

  clear(key: string): void {
    this.cache.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}