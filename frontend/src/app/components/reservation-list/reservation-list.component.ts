import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReservationsService } from '../../services/reservations.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reservation-list',
  templateUrl: './reservation-list.component.html',
  styleUrls: ['./reservation-list.component.css']
})
export class ReservationListComponent implements OnInit {
  reservations: any[] = [];
  currentUserId: number | null = null;
  isAdmin: boolean = false;

  weeks: any[] = [];
  timeLabels: string[] = [];

  PIXELS_PER_MINUTE = 2; // 120px per hour
  START_HOUR = 8; // 08:00
  END_HOUR = 18; // 18:00

  constructor(
    private reservationsService: ReservationsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    this.isAdmin = this.authService.getRole() === 'ADMIN';
    this.generateTimeLabels();
    this.loadReservations();
  }

  generateTimeLabels() {
    this.timeLabels = [];
    for (let i = this.START_HOUR; i <= this.END_HOUR; i++) {
      this.timeLabels.push(`${i.toString().padStart(2, '0')}:00`);
    }
  }

  loadReservations() {
    this.reservationsService.getReservations().subscribe({
      next: (data) => {
        this.reservations = data;
        this.buildCalendar();
      },
      error: () => {
        alert('Error loading reservations');
      },
    });
  }

  buildCalendar() {
    // Generate 4 weeks starting from current week
    this.weeks = [];
    const today = new Date();
    // find monday of this week
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
    const startMonday = new Date(today.setDate(diff));
    startMonday.setHours(0,0,0,0);

    for (let w = 0; w < 4; w++) {
      const weekDate = new Date(startMonday);
      weekDate.setDate(weekDate.getDate() + (w * 7));
      
      const cw = this.getWeekNumber(weekDate);

      const days = [];
      for (let d = 0; d < 5; d++) { // Mon to Fri
        const date = new Date(weekDate);
        date.setDate(date.getDate() + d);
        
        // Filter reservations for this day
        const dayReservations = this.reservations.filter(r => {
           const rDate = new Date(r.startTime);
           return rDate.getDate() === date.getDate() && 
                  rDate.getMonth() === date.getMonth() && 
                  rDate.getFullYear() === date.getFullYear();
        });

        days.push({
          date: date,
          name: date.toLocaleDateString('en-US', { weekday: 'short' }),
          reservations: dayReservations
        });
      }

      this.weeks.push({
        name: `CW ${cw}`,
        days: days
      });
    }
  }

  getWeekNumber(d: Date) {
      const dateCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      dateCopy.setUTCDate(dateCopy.getUTCDate() + 4 - (dateCopy.getUTCDay()||7));
      const yearStart = new Date(Date.UTC(dateCopy.getUTCFullYear(),0,1));
      const weekNo = Math.ceil(( ( (dateCopy.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
      return weekNo;
  }

  getTopPos(r: any): number {
    const d = new Date(r.startTime);
    let hours = d.getHours();
    let mins = d.getMinutes();
    
    // Bounds checking
    if (hours < this.START_HOUR) {
      hours = this.START_HOUR;
      mins = 0;
    }

    const totalMins = (hours - this.START_HOUR) * 60 + mins;
    return totalMins * this.PIXELS_PER_MINUTE;
  }

  getHeight(r: any): number {
    const s = new Date(r.startTime);
    const e = new Date(r.endTime);
    let startMins = (s.getHours() - this.START_HOUR) * 60 + s.getMinutes();
    let endMins = (e.getHours() - this.START_HOUR) * 60 + e.getMinutes();

    // Bounds matching
    if (startMins < 0) startMins = 0;
    const maxMins = (this.END_HOUR - this.START_HOUR) * 60;
    if (endMins > maxMins) endMins = maxMins;

    const diffMins = endMins - startMins;
    return diffMins > 0 ? (diffMins * this.PIXELS_PER_MINUTE) : 0;
  }

  editReservation(id: number) {
    this.router.navigate(['/reservations/edit', id]);
  }

  canModify(r: any): boolean {
    if (r.type === 'BUFFER') return false; 
    return this.isAdmin || r.userId === this.currentUserId;
  }

  deleteReservation(id: number, event: Event) {
    event.stopPropagation();
    if(confirm('Are you sure you want to delete this reservation?')) {
      this.reservationsService.deleteReservation(id).subscribe({
        next: () => {
          this.loadReservations();
        },
      });
    }
  }

  isDragging = false;
  dragDay: any = null;
  dragStartY = 0;
  dragCurrentY = 0;

  onMouseDown(event: MouseEvent, day: any) {
    if (event.button !== 0) return; // Only left click
    
    // If clicking on an existing reservation, don't start dragging
    const target = event.target as HTMLElement;
    if (target.closest('.reservation-card')) return;

    this.isDragging = true;
    this.dragDay = day;
    
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    this.dragStartY = event.clientY - rect.top;
    this.dragCurrentY = this.dragStartY;
  }

  onMouseMove(event: MouseEvent, day: any) {
    if (!this.isDragging || this.dragDay !== day) return;
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    this.dragCurrentY = event.clientY - rect.top;
  }

  onMouseUp(event: MouseEvent, day: any) {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    let y1 = Math.min(this.dragStartY, this.dragCurrentY);
    let y2 = Math.max(this.dragStartY, this.dragCurrentY);

    if (y2 - y1 < 10) { 
      y2 = y1 + 60 * this.PIXELS_PER_MINUTE; // Default 1 hour
    }

    const startMins = Math.round((y1 / this.PIXELS_PER_MINUTE) / 10) * 10;
    const endMins = Math.round((y2 / this.PIXELS_PER_MINUTE) / 10) * 10;

    const startHours = this.START_HOUR + Math.floor(startMins / 60);
    const sMins = startMins % 60;
    
    const endHours = this.START_HOUR + Math.floor(endMins / 60);
    const eMins = endMins % 60;

    let startTime = new Date(day.date);
    startTime.setHours(startHours, sMins, 0, 0);

    let endTime = new Date(day.date);
    endTime.setHours(endHours, eMins, 0, 0);

    const reservations = day.reservations.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    for (let r of reservations) {
      const rStart = new Date(r.startTime);
      const rEnd = new Date(r.endTime);
      
      if (startTime >= rStart && startTime < rEnd) {
         startTime = rEnd;
      }
      
      if (startTime < rStart && endTime > rStart) {
         endTime = rStart;
      }
    }

    const diffMins = (endTime.getTime() - startTime.getTime()) / 60000;
    if (diffMins < 60) {
       endTime = new Date(startTime.getTime() + 60 * 60000);
       
       for (let r of reservations) {
          const rStart = new Date(r.startTime);
          if (startTime < rStart && endTime > rStart) {
             alert('Not enough free time slot for a 1-hour reservation.');
             return;
          }
       }
    }

    this.router.navigate(['/reservations/new'], {
      queryParams: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      }
    });
  }

  getDragBoxTop(): number {
    return Math.min(this.dragStartY, this.dragCurrentY);
  }

  getDragBoxHeight(): number {
    return Math.abs(this.dragCurrentY - this.dragStartY);
  }
}
