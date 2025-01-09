import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaresManagementComponent } from './fares-management.component';

describe('FaresManagementComponent', () => {
  let component: FaresManagementComponent;
  let fixture: ComponentFixture<FaresManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FaresManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FaresManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
