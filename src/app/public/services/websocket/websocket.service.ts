import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
// https://clarknav-websocket-e8b0952da147.herokuapp.com

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;

  constructor() {
    // use this for live deployment https://clarknav-websocket-e8b0952da147.herokuapp.com
    // use this for local development http://localhost:4000
    this.socket = io('https://clarknav-websocket-e8b0952da147.herokuapp.com', {
      transports: ['websocket', 'polling'], // Ensure both transports are allowed
    }); // Replace with your Heroku app URL

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  public on(event: string, callback: (data: any) => void): void {
    this.socket.on(event, callback);
  }

  public emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  public disconnect(): void {
    this.socket.disconnect();
  }

  // Add methods for real-time tracking
  public subscribeToRealTimeTracking(callback: (data: any) => void): void {
    this.on('realTimeTrackingUpdate', (data) => {
      console.log('Received real-time location update:', data);
      callback(data);
    });
  }

  public sendLocationUpdate(location: { lat: number; lng: number }): void {
    console.log('Sending location update:', location);
    this.emit('locationUpdate', location);
  }
}