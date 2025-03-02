import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../../models/user';
import { environment } from '../../../../environments/environment';
import { Feedback } from '../../../models/feedback';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.usersUrl; 

  constructor(private http: HttpClient) { }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getFeedbacks(): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(environment.feedbackUrl);
  }

  updateUser(id: number, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateFeedback(feedback: Feedback): Observable<Feedback> {
    return this.http.put<Feedback>(`${environment.feedbackUrl}/${feedback.id}`, feedback);
  }
}
