import { Directive, ElementRef, OnInit } from '@angular/core';
import * as Hammer from 'hammerjs';

@Directive({
  selector: '[appPinchZoom]'
})
export class PinchZoomDirective implements OnInit {
  private hammer!: HammerManager;
  private scale: number = 1;
  private lastScale: number = 1;
  private posX: number = 0;
  private posY: number = 0;
  private lastPosX: number = 0;
  private lastPosY: number = 0;
  private transform: string = '';
  private maxPosX: number = 0;
  private maxPosY: number = 0;
  private elWidth: number = 0;
  private elHeight: number = 0;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.hammer = new Hammer.default(this.el.nativeElement);
    this.hammer.get('pinch').set({ enable: true });
    this.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

    this.elWidth = this.el.nativeElement.clientWidth;
    this.elHeight = this.el.nativeElement.clientHeight;

    this.hammer.on('pinch', (event) => {
      this.scale = Math.max(1, Math.min(this.lastScale * event.scale, 4));
      this.updateTransform();
    });

    this.hammer.on('pinchend', () => {
      this.lastScale = this.scale;
      this.updateMaxPositions();
    });

    this.hammer.on('pan', (event) => {
      this.posX = this.lastPosX + event.deltaX;
      this.posY = this.lastPosY + event.deltaY;
      this.updateTransform();
    });

    this.hammer.on('panend', () => {
      this.lastPosX = this.posX;
      this.lastPosY = this.posY;
    });
  }

  private updateTransform() {
    this.transform = `translate3d(${this.posX}px, ${this.posY}px, 0) scale(${this.scale})`;
    this.el.nativeElement.style.transform = this.transform;
  }

  private updateMaxPositions() {
    this.maxPosX = (this.elWidth * this.scale - this.elWidth) / 2;
    this.maxPosY = (this.elHeight * this.scale - this.elHeight) / 2;
    this.posX = Math.min(this.maxPosX, Math.max(-this.maxPosX, this.posX));
    this.posY = Math.min(this.maxPosY, Math.max(-this.maxPosY, this.posY));
    this.lastPosX = this.posX;
    this.lastPosY = this.posY;
  }
}