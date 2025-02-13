// filepath: /d:/Documents/School Files/clarknav-web/src/app/public/components/information/information.component.ts
import { Component } from '@angular/core';
import { FloatingWindowService } from '../../../floating-window.service';

@Component({
  selector: 'app-information',
  templateUrl: './information.component.html',
  styleUrls: ['./information.component.css']
})
export class InformationComponent {
  
  constructor(private floatingWindowService: FloatingWindowService) {}

  // Tab Controller
  activeTab: string = 'tab1';

  openTab(tabName: string): void {
    this.activeTab = tabName;
  }

  // Image Controller
  zoomedImage: string | null = null;

  openImage(event: Event): void {
    const target = event.target as HTMLImageElement;
    this.zoomedImage = target.src;
  }

  closeImage(): void {
    this.zoomedImage = null;
  }

  // Close Floating Window
  closeWindow(event: Event) {
    event.stopPropagation();
    this.floatingWindowService.close();
  }
}