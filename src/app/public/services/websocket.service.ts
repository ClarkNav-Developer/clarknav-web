import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('https://clarknav-websocket-e8b0952da147.herokuapp.com', {
      transports: ['websocket', 'polling'], // Ensure both transports are allowed
    }); // Replace with your Heroku app URL
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
}