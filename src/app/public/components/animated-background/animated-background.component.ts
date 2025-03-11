import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-animated-background',
  templateUrl: './animated-background.component.html',
  styleUrls: ['./animated-background.component.scss']
})
export class AnimatedBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('backgroundCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private blobs: Blob[] = [];
  private animationFrameId!: number;
  private lastRenderTime = 0;
  private readonly frameRate = 30; // Target frame rate
  private isLowTierMobile = false;
  testFallback: boolean = false;

  private checkCanvasSupport(): boolean {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
  }

  ngAfterViewInit(): void {
    const hasCanvasSupport = this.checkCanvasSupport();
    
    if (this.testFallback) {
      this.applyFallbackBlur();
      this.setRandomBlobPositions();
    } else {
      if (!hasCanvasSupport) {
        // Add class to parent element to trigger the CSS fallback
        if (this.canvasRef.nativeElement.parentElement) {
          this.canvasRef.nativeElement.parentElement.classList.add('no-canvas-support');
        }
      } else {
        this.isLowTierMobile = this.checkIfLowTierMobile();
        const canvas = this.canvasRef.nativeElement;
        this.ctx = canvas.getContext('2d')!;
        this.resizeCanvas();
        this.initBlobs();
        if (!this.isLowTierMobile) {
          this.animate();
        }
      }
    }
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private initBlobs(): void {
    if (this.isLowTierMobile) {
      this.blobs = [
        new Blob('rgba(249, 129, 0, 0.5)', 30, 140, 0.4, this.canvasRef.nativeElement),
        new Blob('rgba(29, 88, 198, 0.5)', 30, 150, 0.45, this.canvasRef.nativeElement)
      ];
    } else if (this.isMidTierMobile()) {
      this.blobs = [
        new Blob('rgba(249, 129, 0, 0.5)', 60, 280, 0.8, this.canvasRef.nativeElement),
        new Blob('rgba(249, 129, 0, 0.5)', 50, 320, 0.7, this.canvasRef.nativeElement),
        new Blob('rgba(29, 88, 198, 0.5)', 60, 300, 0.9, this.canvasRef.nativeElement),
        new Blob('rgba(29, 88, 198, 0.5)', 55, 260, 0.75, this.canvasRef.nativeElement)
      ];
    } else {
      this.blobs = [
        // Two orange variations
        new Blob('rgba(249, 129, 0, 0.5)', 100, 500, 1.2, this.canvasRef.nativeElement),
        new Blob('rgba(249, 129, 0, 0.5)', 90, 450, 1.1, this.canvasRef.nativeElement),

        // Two blue variations
        new Blob('rgba(29, 88, 198, 0.5)', 100, 480, 1.3, this.canvasRef.nativeElement),
        new Blob('rgba(29, 88, 198, 0.5)', 95, 420, 1.15, this.canvasRef.nativeElement),

        // Two orange variations
        new Blob('rgba(249, 129, 0, 0.5)', 100, 500, 1.2, this.canvasRef.nativeElement),
        new Blob('rgba(249, 129, 0, 0.5)', 90, 450, 1.1, this.canvasRef.nativeElement),

        // Two blue variations
        new Blob('rgba(29, 88, 198, 0.5)', 100, 480, 1.3, this.canvasRef.nativeElement),
        new Blob('rgba(29, 88, 198, 0.5)', 95, 420, 1.15, this.canvasRef.nativeElement),

        // Two orange variations
        new Blob('rgba(249, 129, 0, 0.5)', 100, 500, 1.2, this.canvasRef.nativeElement),
        new Blob('rgba(249, 129, 0, 0.5)', 90, 450, 1.1, this.canvasRef.nativeElement),

        // Two blue variations
        new Blob('rgba(29, 88, 198, 0.5)', 100, 480, 1.3, this.canvasRef.nativeElement),
        new Blob('rgba(29, 88, 198, 0.5)', 95, 420, 1.15, this.canvasRef.nativeElement)
      ];
    }
  }

  private animate(timestamp = 0): void {
    const deltaTime = timestamp - this.lastRenderTime;
    if (deltaTime < 1000 / this.frameRate) {
      this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts));
      return;
    }
    this.lastRenderTime = timestamp;

    // Clear canvas with transparency
    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

    // Update and draw blobs
    for (let i = 0; i < this.blobs.length; i++) {
      const blob = this.blobs[i];
      blob.update();

      // Check for collisions with other blobs
      for (let j = i + 1; j < this.blobs.length; j++) {
        const otherBlob = this.blobs[j];
        const dx = blob.x - otherBlob.x;
        const dy = blob.y - otherBlob.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (blob.size + otherBlob.size) / 2 + 2; // Add a small gap

        if (distance < minDistance) {
          // Resolve collision by adjusting positions and velocities
          const angle = Math.atan2(dy, dx);
          const overlap = minDistance - distance;
          const adjustX = Math.cos(angle) * overlap / 2;
          const adjustY = Math.sin(angle) * overlap / 2;

          blob.x += adjustX;
          blob.y += adjustY;
          otherBlob.x -= adjustX;
          otherBlob.y -= adjustY;

          // Swap velocities
          const tempVx = blob.vx;
          const tempVy = blob.vy;
          blob.vx = otherBlob.vx;
          blob.vy = otherBlob.vy;
          otherBlob.vx = tempVx;
          otherBlob.vy = tempVy;
        }
      }

      blob.draw(this.ctx);
    }

    this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts));
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private checkIfLowTierMobile(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod/i.test(userAgent) && window.devicePixelRatio < 2;
  }

  private isMidTierMobile(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod/i.test(userAgent) && window.devicePixelRatio >= 2 && window.devicePixelRatio < 3;
  }

  private applyFallbackBlur(): void {
    for (const blob of this.blobs) {
      blob.blur = 0; // Disable blur for fallback
    }
  }

  private setRandomBlobPositions(): void {
    const blobs = document.querySelectorAll('.fallback-background .blob');
    blobs.forEach(blob => {
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      (blob as HTMLElement).style.setProperty('--blob-top', `${top}%`);
      (blob as HTMLElement).style.setProperty('--blob-left', `${left}%`);
    });
  }
}

// Blob class
class Blob {
  public x: number;
  public y: number;
  public size: number;
  private color: string;
  public blur: number;
  public vx: number;
  public vy: number;
  private angle: number;
  private angleSpeed: number;
  private oscillationRange: number;
  private canvas: HTMLCanvasElement;

  constructor(color: string, blur: number, size: number, speed: number, canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = size || Math.random() * 300 + 200;
    this.color = color;
    this.blur = blur;
    const speedFactor = (speed || 1) * 2; // Increase the speed factor
    this.vx = (Math.random() - 0.5) * 0.5 * speedFactor;
    this.vy = (Math.random() - 0.5) * 0.5 * speedFactor;

    // Add some oscillation
    this.angle = Math.random() * Math.PI * 2;
    this.angleSpeed = 0.01 + Math.random() * 0.01;
    this.oscillationRange = 0.2 + Math.random() * 0.3;
  }

  update(): void {
    // Add gentle oscillation to movement
    this.angle += this.angleSpeed;
    this.x += this.vx + Math.sin(this.angle) * this.oscillationRange;
    this.y += this.vy + Math.cos(this.angle) * this.oscillationRange;

    // Bounce off edges with some padding
    const padding = this.size / 2;
    if (this.x < -padding) this.vx = Math.abs(this.vx);
    if (this.x > this.canvas.width + padding) this.vx = -Math.abs(this.vx);
    if (this.y < -padding) this.vy = Math.abs(this.vy);
    if (this.y > this.canvas.height + padding) this.vy = -Math.abs(this.vy);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if ('filter' in ctx) {
      ctx.filter = `blur(${this.blur}px)`;
    } else {
      // Fallback for devices that do not support the filter property
      (ctx as CanvasRenderingContext2D).shadowColor = this.color;
      (ctx as CanvasRenderingContext2D).shadowBlur = this.blur;
    }
    ctx.fillStyle = this.color;
    ctx.beginPath();
    // Create slightly irregular blob shape
    ctx.ellipse(
      this.x,
      this.y,
      this.size * (1 + Math.sin(this.angle) * 0.1),
      this.size * 0.7 * (1 + Math.cos(this.angle) * 0.1),
      this.angle * 0.2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }
}