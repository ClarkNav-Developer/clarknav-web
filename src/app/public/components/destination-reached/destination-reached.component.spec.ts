import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DestinationReachedComponent } from './destination-reached.component';

describe('DestinationReachedComponent', () => {
  let component: DestinationReachedComponent;
  let fixture: ComponentFixture<DestinationReachedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DestinationReachedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DestinationReachedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
