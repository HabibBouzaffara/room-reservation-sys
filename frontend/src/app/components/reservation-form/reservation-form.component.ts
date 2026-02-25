import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReservationsService } from '../../services/reservations.service';

@Component({
  selector: 'app-reservation-form',
  templateUrl: './reservation-form.component.html',
})
export class ReservationFormComponent implements OnInit {
  isEditMode = false;
  reservationId: number | null = null;

  startTime = '';
  endTime = '';
  
  activityType = '';
  activityDesc = '';
  activity = ''; // Final combined string
  
  hardware = '';
  software = '';

  hardwareList: any[] = [];
  softwareList: any[] = [];
  activities: string[] = ['FV', 'Coverage', 'Pr testing', 'DV', 'Intake', 'Fusi', 'Workshop', 'Other'];

  constructor(
    private reservationsService: ReservationsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const startQ = this.route.snapshot.queryParamMap.get('start');
    const endQ = this.route.snapshot.queryParamMap.get('end');

    if (startQ) {
       const start = new Date(startQ);
       start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
       this.startTime = start.toISOString().slice(0, 16);
    }
    if (endQ) {
       const end = new Date(endQ);
       end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
       this.endTime = end.toISOString().slice(0, 16);
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.reservationId = +idParam;
      this.loadReservationData(this.reservationId);
    }

    this.loadSysConfig();
  }

  loadSysConfig() {
    this.reservationsService.getHardware().subscribe(data => this.hardwareList = data || []);
    this.reservationsService.getSoftware().subscribe(data => this.softwareList = data || []);
  }

  loadReservationData(id: number) {
    this.reservationsService.getReservation(id).subscribe({
      next: (data) => {
        // Format dates to fit datetime-local input
        if (data.startTime) {
          const start = new Date(data.startTime);
          start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
          this.startTime = start.toISOString().slice(0, 16);
        }
        if (data.endTime) {
          const end = new Date(data.endTime);
          end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
          this.endTime = end.toISOString().slice(0, 16);
        }

        if (this.activities.includes(data.activity)) {
          this.activityType = data.activity;
        } else {
          this.activityType = 'Other';
          this.activityDesc = data.activity;
        }

        this.hardware = data.hardware;
        this.software = data.software;
      },
      error: () => {
        alert('Failed to load reservation details');
        this.router.navigate(['/reservations']);
      }
    });
  }

  saveReservation() {
    const finalActivity = this.activityType === 'Other' ? this.activityDesc : this.activityType;

    const reservationData = {
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(this.endTime).toISOString(),
      activity: finalActivity,
      hardware: this.hardware,
      software: this.software,
    };

    if (this.isEditMode && this.reservationId) {
      this.reservationsService.updateReservation(this.reservationId, reservationData).subscribe({
        next: () => {
          alert('Reservation updated successfully');
          this.router.navigate(['/reservations']);
        },
        error: (err) => {
          alert(err.error?.message || 'Error updating reservation');
        },
      });
    } else {
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
}
