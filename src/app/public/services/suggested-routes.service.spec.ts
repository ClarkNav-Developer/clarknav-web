import { TestBed } from '@angular/core/testing';

import { SuggestedRoutesService } from './suggested-routes.service';

describe('SuggestedRoutesService', () => {
  let service: SuggestedRoutesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SuggestedRoutesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
