import { TestBed } from '@angular/core/testing';

import { MapStyleService } from '../services/map/map-style.service';

describe('MapStyleService', () => {
  let service: MapStyleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapStyleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
