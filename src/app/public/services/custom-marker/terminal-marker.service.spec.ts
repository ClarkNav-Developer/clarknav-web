import { TestBed } from '@angular/core/testing';

import { TerminalMarkerService } from './terminal-marker.service';

describe('TerminalMarkerService', () => {
  let service: TerminalMarkerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TerminalMarkerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
