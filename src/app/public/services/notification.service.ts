import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private defaultDuration = 3000; // 3 seconds

  constructor() {
    // Create container for notifications on service init
    this.createNotificationContainer();
  }

  /**
   * Creates a container for notifications if it doesn't exist
   */
  private createNotificationContainer(): void {
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      document.body.appendChild(container);
    }
  }

  /**
   * Shows a success notification
   * @param message The message to display
   * @param duration Optional duration in milliseconds
   */
  success(message: string, duration: number = this.defaultDuration): void {
    this.showNotification(message, 'success', duration);
  }

  /**
   * Shows an error notification
   * @param message The message to display
   * @param duration Optional duration in milliseconds
   */
  error(message: string, duration: number = this.defaultDuration): void {
    this.showNotification(message, 'error', duration);
  }

  /**
   * Shows an info notification
   * @param message The message to display
   * @param duration Optional duration in milliseconds
   */
  info(message: string, duration: number = this.defaultDuration): void {
    this.showNotification(message, 'info', duration);
  }

  /**
   * Shows a warning notification
   * @param message The message to display
   * @param duration Optional duration in milliseconds
   */
  warning(message: string, duration: number = this.defaultDuration): void {
    this.showNotification(message, 'warning', duration);
  }

  /**
   * Shows a notification with the specified type
   * @param message The message to display
   * @param type The type of notification (success, error, info, warning)
   * @param duration Duration in milliseconds
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning', duration: number): void {
    const container = document.getElementById('notification-container');
    if (!container) {
      this.createNotificationContainer();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Create notification content
    const iconMap = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
      warning: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };
    
    notification.innerHTML = `
      <div class="notification-icon">${iconMap[type] || ''}</div>
      <div class="notification-message">${message}</div>
      <button class="notification-close">×</button>
    `;

    // Add to container
    const notificationContainer = document.getElementById('notification-container');
    if (notificationContainer) {
      notificationContainer.appendChild(notification);
    }

    // Add event listener for close button
    const closeButton = notification.querySelector('.notification-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.removeNotification(notification);
      });
    }

    // Show with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-remove after duration
    setTimeout(() => {
      this.removeNotification(notification);
    }, duration);
  }

  /**
   * Removes a notification with animation
   * @param notification The notification element to remove
   */
  private removeNotification(notification: HTMLElement): void {
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
    }, 300); // Animation duration
  }
}