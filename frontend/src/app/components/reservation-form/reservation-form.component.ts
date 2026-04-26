import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReservationsService } from '../../services/reservations.service';

@Component({
  standalone: false,
  selector: 'app-reservation-form',
  templateUrl: './reservation-form.component.html',
})
export class ReservationFormComponent implements OnInit {
  isEditMode = false;
  reservationId: number | null = null;

  startTime = '';
  endTime = '';
  room = 'IPB';
  isHardwareOnly = false;
  
  activityType = '';
  activityDesc = '';
  activity = ''; // Final combined string
  
  hardware = '';
  software = '';
  softwareSelection = '';
  customSoftware = '';

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
    
    const roomQ = this.route.snapshot.queryParamMap.get('room');
    if (roomQ) {
      this.room = roomQ;
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
    let startIso: string | undefined;
    let endIso: string | undefined;
    if (this.startTime && this.endTime) {
      startIso = new Date(this.startTime).toISOString();
      endIso = new Date(this.endTime).toISOString();
    }
    
    this.reservationsService.getHardware(this.room, startIso, endIso).subscribe(data => this.hardwareList = data || []);
    this.reservationsService.getSoftware(this.room).subscribe(data => {
      this.softwareList = data || [];
      this.resolveSoftwareSelection();
    });
  }

  resolveSoftwareSelection() {
    if (this.software) {
       const found = this.softwareList.find(s => s.name === this.software);
       if (found) {
         this.softwareSelection = this.software;
       } else {
         this.softwareSelection = 'Other';
         this.customSoftware = this.software;
       }
    }
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
        
        if (data.room) {
          this.room = data.room;
          this.loadSysConfig(); // Reload sys config based on existing reservation room
        }

        if (this.activities.includes(data.activity)) {
          this.activityType = data.activity;
        } else {
          this.activityType = 'Other';
          this.activityDesc = data.activity;
        }

        this.hardware = data.hardware;
        this.software = data.software;
        this.isHardwareOnly = data.isHardwareOnly || false;
        this.resolveSoftwareSelection();
      },
      error: () => {
        alert('Failed to load reservation details');
        this.router.navigate(['/reservations']);
      }
    });
  }

  saveReservation() {
    const finalActivity = this.activityType === 'Other' ? this.activityDesc : this.activityType;
    const finalSoftware = this.softwareSelection === 'Other' ? this.customSoftware : this.softwareSelection;

    const reservationData = {
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(this.endTime).toISOString(),
      activity: finalActivity,
      hardware: this.hardware,
      software: finalSoftware,
      room: this.room,
      isHardwareOnly: this.isHardwareOnly,
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
