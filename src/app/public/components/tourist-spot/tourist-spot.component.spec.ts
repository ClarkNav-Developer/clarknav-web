import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TouristSpotComponent } from './tourist-spot.component';

describe('TouristSpotComponent', () => {
  let component: TouristSpotComponent;
  let fixture: ComponentFixture<TouristSpotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TouristSpotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TouristSpotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
