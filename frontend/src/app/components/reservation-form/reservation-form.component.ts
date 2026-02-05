import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ReservationsService } from '../../services/reservations.service';

@Component({
  selector: 'app-reservation-form',
  templateUrl: './reservation-form.component.html',
})
export class ReservationFormComponent {
  startTime = '';
  endTime = '';
  activity = '';
  hardware = '';
  software = '';

  constructor(
    private reservationsService: ReservationsService,
    private router: Router,
  ) {}

  createReservation() {
    const reservationData = {
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(this.endTime).toISOString(),
      activity: this.activity,
      hardware: this.hardware,
      software: this.software,
    };

    this.reservationsService.createReservation(reservationData).subscribe({
      next: () => {
        alert('Reservation created successfully');
        this.router.navigate(['/reservations']);
      },
      error: (err) => {
        alert(err.error?.message || 'Error creating reservation');
      },
    });
  }
}
