import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JeepneyRouteComponent } from './jeepney-route.component';

describe('JeepneyRouteComponent', () => {
  let component: JeepneyRouteComponent;
  let fixture: ComponentFixture<JeepneyRouteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JeepneyRouteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JeepneyRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
