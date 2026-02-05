import { Component, OnInit } from '@angular/core';
import { ReservationsService } from '../../services/reservations.service';

@Component({
  selector: 'app-reservation-list',
  templateUrl: './reservation-list.component.html',
})
export class ReservationListComponent implements OnInit {
  reservations: any[] = [];

  constructor(private reservationsService: ReservationsService) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations() {
    this.reservationsService.getReservations().subscribe({
      next: (data) => {
        this.reservations = data;
      },
      error: () => {
        alert('Error loading reservations');
      },
    });
  }

  deleteReservation(id: number) {
    this.reservationsService.deleteReservation(id).subscribe({
      next: () => {
        alert('Deleted');
        this.loadReservations();
      },
    });
  }
}
