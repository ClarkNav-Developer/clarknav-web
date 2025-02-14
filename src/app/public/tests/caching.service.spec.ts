import { TestBed } from '@angular/core/testing';

import { CacheService } from '../services/caching/caching.service';

describe('CachingService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
