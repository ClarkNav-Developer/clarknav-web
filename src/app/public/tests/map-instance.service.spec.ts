import { TestBed } from '@angular/core/testing';

import { MapInstanceService } from '../services/map/map-instance.service';

describe('MapInstanceService', () => {
  let service: MapInstanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapInstanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
