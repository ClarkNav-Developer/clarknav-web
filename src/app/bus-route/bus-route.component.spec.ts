import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusRouteComponent } from './bus-route.component';

describe('BusRouteComponent', () => {
  let component: BusRouteComponent;
  let fixture: ComponentFixture<BusRouteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BusRouteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
