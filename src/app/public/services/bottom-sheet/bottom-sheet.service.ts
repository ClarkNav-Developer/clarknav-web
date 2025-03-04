import { Injectable, Renderer2 } from '@angular/core';
import { MapService } from '../map/map.service';

@Injectable({
  providedIn: 'root'
})
export class BottomSheetService {
  private renderer: Renderer2 | null = null;
  private isDragging = false;
  private startY = 0;
  private startHeight = 0;

  constructor(private mapService: MapService) {}
  
  setRenderer(renderer: Renderer2): void {
    this.renderer = renderer;
  }

  setupDragging(bottomSheet: HTMLElement, handle: HTMLElement): void {
    if (!this.renderer) {
      console.error('Renderer2 is not set.');
      return;
    }
    this.renderer.listen(handle, 'mousedown', (event: MouseEvent) => this.initiateDrag(event, bottomSheet));
    this.renderer.listen(handle, 'touchstart', (event: TouchEvent) => this.initiateDrag(event, bottomSheet));
  }

  public initiateDrag(event: MouseEvent | TouchEvent, bottomSheet: HTMLElement): void {
    event.preventDefault();
    this.isDragging = true;
    this.startY = this.getClientY(event);
    this.startHeight = bottomSheet.offsetHeight;

    const moveHandler = (moveEvent: MouseEvent | TouchEvent) => this.performDrag(moveEvent, bottomSheet);
    const endHandler = () => {
      this.endDrag(bottomSheet);
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
  }

  private performDrag(event: MouseEvent | TouchEvent, bottomSheet: HTMLElement): void {
    if (!this.isDragging) return;

    const currentY = this.getClientY(event);
    const deltaY = this.startY - currentY;
    const newHeight = Math.min(window.innerHeight, Math.max(150, this.startHeight + deltaY));
    this.updateBottomSheetHeight(bottomSheet, newHeight);
  }

  private endDrag(bottomSheet: HTMLElement): void {
      this.isDragging = false;
  
      const finalHeight = parseInt(bottomSheet.style.height || '0', 10);
      const threshold = window.innerHeight / 2;
  
      if (finalHeight > threshold) {
        this.snapToHeight(bottomSheet, '50vh');
      } else {
        this.snapToHeight(bottomSheet, '150px'); // Set height to 150px when dragged down
      }
  }

  private snapToHeight(bottomSheet: HTMLElement, height: string): void {
    bottomSheet.style.transition = 'height 0.3s ease';
    bottomSheet.style.height = height;
    setTimeout(() => bottomSheet.style.transition = '', 300);
  }

  private getClientY(event: MouseEvent | TouchEvent): number {
    return event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY || 0;
  }

  private updateBottomSheetHeight(bottomSheet: HTMLElement, height: number): void {
    bottomSheet.style.height = `${height}px`;
  }

  public toggleBottomSheet(): void {
      const mobileBottomSheet = document.querySelector('.bottom-sheet-mobile');
      if (mobileBottomSheet) {
        if (mobileBottomSheet.classList.contains('hide')) {
          mobileBottomSheet.classList.remove('hide');
        }
        mobileBottomSheet.classList.toggle('show');
        (mobileBottomSheet as HTMLElement).style.height = '50vh'; // Set initial height to 50vh
      }
  }

  public hideBottomSheet(mapService: MapService): void {
    const mobileBottomSheet = document.querySelector('.bottom-sheet-mobile');
    if (mobileBottomSheet) {
      mobileBottomSheet.classList.add('hide');
      mobileBottomSheet.classList.remove('show');
    }
    mapService.clearMap();
  }

  public minimizeBottomSheet(): void {
    const bottomSheet = document.getElementById('bottomSheet');
    if (bottomSheet) {
      bottomSheet.style.height = '150px';
      bottomSheet.classList.add('minimized');
    }
  }

  public toggleMobileContainer(): void {
    const mobileContainer = document.querySelector('.mobile-container');
    mobileContainer?.classList.toggle('show');
  }
}