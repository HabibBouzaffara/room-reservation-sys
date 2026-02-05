import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getReservations(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  deleteReservation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
