import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../../models/user';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(environment.user.getUsers);
  }

  updateUser(id: number, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(environment.user.updateUser(id), userData);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(environment.user.deleteUser(id));
  }
}