import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReservationsService } from '../../services/reservations.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reservation-list',
  templateUrl: './reservation-list.component.html',
})
export class ReservationListComponent implements OnInit {
  reservations: any[] = [];
  currentUserId: number | null = null;
  isAdmin: boolean = false;

  constructor(
    private reservationsService: ReservationsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    this.isAdmin = this.authService.getRole() === 'ADMIN';
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

  editReservation(id: number) {
    this.router.navigate(['/reservations/edit', id]);
  }

  canModify(r: any): boolean {
    if (r.type === 'BUFFER') return false; // Usually don't modify buffer directly
    return this.isAdmin || r.userId === this.currentUserId;
  }

  deleteReservation(id: number) {
    if(confirm('Are you sure you want to delete this reservation?')) {
      this.reservationsService.deleteReservation(id).subscribe({
        next: () => {
          this.loadReservations();
        },
      });
    }
  }
}
