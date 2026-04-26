import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReservationsService {
  private apiUrl = 'http://localhost:3000/reservations';

  constructor(private http: HttpClient) {}

  createReservation(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getReservations(room: string = 'IPB'): Observable<any> {
    return this.http.get(`${this.apiUrl}?room=${room}`);
  }

  getReservation(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateReservation(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}`, data);
  }

  deleteReservation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getHistory(): Observable<any> {
    return this.http.get('http://localhost:3000/history');
  }

  getReservationHistory(reservationId: number): Observable<any> {
    return this.http.get(`http://localhost:3000/history/reservation/${reservationId}`);
  }

  getHardware(room?: string, start?: string, end?: string): Observable<any[]> {
    let params = new HttpParams();
    if (room) params = params.set('room', room);
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<any[]>('http://localhost:3000/sysconfig/hardware', { params });
  }

  getSoftware(room: string = 'IPB'): Observable<any> {
    return this.http.get(`http://localhost:3000/sysconfig/software?room=${room}`);
  }

  // --- Sysconfig Management (Admin) ---
  addHardware(name: string, room: string = 'IPB', quantity: number = 1): Observable<any> {
    return this.http.post('http://localhost:3000/sysconfig/hardware', { name, room, quantity });
  }

  deleteHardware(id: number): Observable<any> {
    return this.http.delete(`http://localhost:3000/sysconfig/hardware/${id}`);
  }

  addSoftware(name: string, room: string = 'IPB'): Observable<any> {
    return this.http.post('http://localhost:3000/sysconfig/software', { name, room });
  }

  deleteSoftware(id: number): Observable<any> {
    return this.http.delete(`http://localhost:3000/sysconfig/software/${id}`);
  }

  getWorkingHours(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/sysconfig/working-hours');
  }

  setWorkingHours(rules: any[]): Observable<any> {
    return this.http.post('http://localhost:3000/sysconfig/working-hours', { rules });
  }

  // --- User Management (Admin) ---
  getUsers(): Observable<any> {
    return this.http.get('http://localhost:3000/users');
  }

  approveUser(userId: number): Observable<any> {
    return this.http.patch(`http://localhost:3000/users/${userId}/approve`, {});
  }
}
