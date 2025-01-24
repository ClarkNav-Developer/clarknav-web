import { TestBed } from '@angular/core/testing';

import { FareService } from '../services/fare/fare.service';

describe('FareService', () => {
  let service: FareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
