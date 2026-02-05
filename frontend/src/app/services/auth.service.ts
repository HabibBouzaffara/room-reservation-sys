import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';

  constructor(private http: HttpClient) {}

  register(data: {
    name: string;
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: {
    email: string;
    password: string;
  }): Observable<{ access_token: string }> {
    return this.http.post<{ access_token: string }>(
      `${this.apiUrl}/login`,
      data,
    );
  }
}
