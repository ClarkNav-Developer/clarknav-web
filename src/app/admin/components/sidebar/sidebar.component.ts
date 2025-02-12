import { Component, ViewChild } from '@angular/core';
import { Sidebar } from 'primeng/sidebar';


@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @ViewChild('sidebarRef') sidebarRef!: Sidebar;

  sidebarVisible: boolean = false;

  closeCallback(e: Event): void {
    this.sidebarRef.close(e);
  }
}
