import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ReservationsService } from '../../services/reservations.service';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: false,
  selector: 'app-reservation-list',
  templateUrl: './reservation-list.component.html',
  styleUrls: ['./reservation-list.component.css']
})
export class ReservationListComponent implements OnInit {
  reservations: any[] = [];
  currentUserId: number | null = null;
  isAdmin: boolean = false;
  rooms: string[] = ['IPB', 'BCP1', 'BCP2', 'BDC1', 'BDC2'];
  selectedRoom: string = 'IPB';

  weeks: any[] = [];
  timeLabels: string[] = [];

  PIXELS_PER_MINUTE = 1;
  START_HOUR = 8;
  END_HOUR = 18;

  weekOffset = -4;
  baseDate = new Date();
  
  isFirstLoad = true;
  @ViewChild('calendarScroll') calendarContainer!: ElementRef;

  // ── History Modal State ────────────────────────────────
  historyModalOpen = false;
  historyModalRes: any = null;     // the reservation being inspected
  historyEvents: any[] = [];       // parsed events for that reservation
  historyPageIndex = 0;            // which event is shown
  historyLoading = false;
  usersMap: Record<number, any> = {};

  workingHourRules: any[] = [];

  constructor(
    private reservationsService: ReservationsService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    this.isAdmin = this.authService.getRole() === 'ADMIN';
    this.reservationsService.getWorkingHours().subscribe({
      next: (rules) => {
        if (rules && Array.isArray(rules)) {
          this.workingHourRules = rules;
        }
        this.updateEffectiveHours();
        this.generateTimeLabels();
        this.loadReservations();
      },
      error: () => {
        this.generateTimeLabels();
        this.loadReservations();
      }
    });

    // Pre-load users map for history name resolution
    this.reservationsService.getUsers().subscribe({
      next: (users: any[]) => users.forEach(u => this.usersMap[u.id] = u),
      error: () => {}
    });
  }

  updateEffectiveHours() {
      this.START_HOUR = 8;
      this.END_HOUR = 18;
  }

  generateTimeLabels() {
    this.timeLabels = [];
    for (let i = this.START_HOUR; i <= this.END_HOUR; i++) {
      this.timeLabels.push(`${i.toString().padStart(2, '0')}:00`);
    }
  }

  setRoom(room: string) {
    this.selectedRoom = room;
    this.loadReservations();
  }

  loadReservations() {
    const today = new Date(this.baseDate);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + (this.weekOffset * 7); 
    const startMonday = new Date(today.getFullYear(), today.getMonth(), diff);
    startMonday.setHours(0,0,0,0);
    
    const endFriday = new Date(startMonday);
    endFriday.setDate(endFriday.getDate() + 55); // + 7 weeks + 6 days = 8 weeks total
    endFriday.setHours(23,59,59,999);

    this.reservationsService.getReservations(this.selectedRoom, startMonday.toISOString(), endFriday.toISOString()).subscribe({
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
    this.weeks = [];
    const today = new Date(this.baseDate);
    // Find Monday of the week offset from baseDate
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + (this.weekOffset * 7); 
    const startMonday = new Date(today.getFullYear(), today.getMonth(), diff);
    startMonday.setHours(0,0,0,0);

    for (let w = 0; w < 8; w++) {
      const weekDate = new Date(startMonday);
      weekDate.setDate(weekDate.getDate() + (w * 7));
      
      const cw = this.getWeekNumber(weekDate);

      const days = [];
      for (let d = 0; d < 5; d++) { // Mon to Fri
        const date = new Date(weekDate);
        date.setDate(date.getDate() + d);
        
        const dayReservations = this.reservations.filter(r => {
           const rDate = new Date(r.startTime);
           return rDate.getDate() === date.getDate() && 
                  rDate.getMonth() === date.getMonth() && 
                  rDate.getFullYear() === date.getFullYear();
        });

        // Determine working hours for this specific day
        let dayStart = 8;
        let dayEnd = 18;
        for (const rule of this.workingHourRules) {
            const rStart = new Date(rule.startDate);
            rStart.setHours(0,0,0,0);
            const rEnd = new Date(rule.endDate);
            rEnd.setHours(23,59,59,999);
            
            if (date.getTime() >= rStart.getTime() && date.getTime() <= rEnd.getTime()) {
               dayStart = rule.startHour;
               dayEnd = rule.endHour;
               break;
            }
        }

        // Generate Out of Office blocks
        if (dayStart > this.START_HOUR) {
           dayReservations.push({
             id: 'ooo_start',
             type: 'OUT_OF_OFFICE',
             startTime: new Date(date).setHours(this.START_HOUR, 0, 0, 0),
             endTime: new Date(date).setHours(dayStart, 0, 0, 0),
             isHardwareOnly: false,
             activity: 'Closed',
             user: { name: 'Admin/System' }
           });
        }
        if (dayEnd < this.END_HOUR) {
           dayReservations.push({
             id: 'ooo_end',
             type: 'OUT_OF_OFFICE',
             startTime: new Date(date).setHours(dayEnd, 0, 0, 0),
             endTime: new Date(date).setHours(this.END_HOUR, 0, 0, 0),
             isHardwareOnly: false,
             activity: 'Closed',
             user: { name: 'Admin/System' }
           });
        }

        days.push({
          date: date,
          name: date.toLocaleDateString('en-US', { weekday: 'short' }),
          reservations: dayReservations
        });
      }

      this.weeks.push({
        name: `CW ${cw}`,
        cw: cw,
        days: days
      });
    }

    if (this.isFirstLoad) {
       this.isFirstLoad = false;
       this.cdr.detectChanges();
       this.scrollToCurrentDay();
    }
  }

  scrollToCurrentDay() {
    if (!this.calendarContainer) return;
    
    const today = new Date();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;

    const timeColumnWidth = 60;
    const weekWidth = 1260; // 5 days * 252px approx
    const dayWidth = 252;
    
    // We start at CW-4. So the offset to the start of the current week (CW) is:
    const currentWeekStartOffset = timeColumnWidth + (weekWidth * 4);
    
    let targetOffset = 0;

    if (isWeekend) {
        // Center the blue line between CW (the week that just ended) and CW+1 (upcoming week)
        targetOffset = currentWeekStartOffset + weekWidth; 
    } else {
        let dayIndex = today.getDay() - 1; // Mon = 0
        targetOffset = currentWeekStartOffset + (dayIndex * dayWidth) + (dayWidth / 2);
    }
    
    const clientWidth = this.calendarContainer.nativeElement.clientWidth;
    let targetScrollLeft = targetOffset - (clientWidth / 2);
    
    if (targetScrollLeft < 0) targetScrollLeft = 0;
    
    this.calendarContainer.nativeElement.scrollLeft = targetScrollLeft;
  }

  updateWeek(newCw: any, weekIndex: number) {
    const val = parseInt(newCw);
    if (isNaN(val)) return;
    const diff = val - this.weeks[weekIndex].cw;
    this.weekOffset += diff;
    this.updateEffectiveHours();
    this.generateTimeLabels();
    this.loadReservations();
  }

  jumpToToday() {
    this.weekOffset = -4;
    this.updateEffectiveHours();
    this.generateTimeLabels();
    
    // Use cached/old reservations just to build skeleton and measure scroll layout synchronously
    this.buildCalendar();
    this.cdr.detectChanges();
    this.scrollToCurrentDay();
    
    // Now fetch real data asynchronously
    this.loadReservations();
  }

  loadPrevWeeks() {
    this.weekOffset -= 8;
    this.updateEffectiveHours();
    this.generateTimeLabels();
    this.loadReservations();
  }

  loadNextWeeks() {
    this.weekOffset += 8;
    this.updateEffectiveHours();
    this.generateTimeLabels();
    this.loadReservations();
  }

  onScroll(event: Event) {
    // Infinite scroll disabled as per request
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  getWeekNumber(d: Date) {
      const dateCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      dateCopy.setUTCDate(dateCopy.getUTCDate() + 4 - (dateCopy.getUTCDay()||7));
      const yearStart = new Date(Date.UTC(dateCopy.getUTCFullYear(),0,1));
      const weekNo = Math.ceil(( ( (dateCopy.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
      return weekNo;
  }

  getActivityColor(act: string): string {
    switch(act) {
      case 'FV': return '#10b981'; 
      case 'Coverage': return '#f59e0b';
      case 'Pr testing': return '#3b82f6';
      case 'DV': return '#8b5cf6';
      case 'Intake': return '#ec4899';
      case 'Fusi': return '#14b8a6';
      case 'Workshop': return '#f97316';
      default: return '#6366f1'; 
    }
  }

  getActivityBg(act: string): string {
    switch(act) {
      case 'FV': return 'rgba(16, 185, 129, 0.15)'; 
      case 'Coverage': return 'rgba(245, 158, 11, 0.15)';
      case 'Pr testing': return 'rgba(59, 130, 246, 0.15)';
      case 'DV': return 'rgba(139, 92, 246, 0.15)';
      case 'Intake': return 'rgba(236, 72, 153, 0.15)';
      case 'Fusi': return 'rgba(20, 184, 166, 0.15)';
      case 'Workshop': return 'rgba(249, 115, 22, 0.15)';
      case 'Closed': return 'rgba(200, 200, 200, 0.6)';
      default: return 'var(--card-bg)';
    }
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
    if (r.type === 'BUFFER' || r.type === 'OUT_OF_OFFICE') return false; 
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

    // Check for negative or too short duration after clamping
    if (endTime.getTime() <= startTime.getTime()) {
       endTime = new Date(startTime.getTime() + 60 * 60000);
    }

    // Filter out hardware-only reservations so they don't block room booking interactions
    const reservations = day.reservations
      .filter((r: any) => !r.isHardwareOnly)
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
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
       
       // Check if this 1-hour extension causes overlap
       for (let r of reservations) {
          const rStart = new Date(r.startTime);
          if (startTime < rStart && endTime > rStart) {
             alert('Not enough free time slot for a 1-hour reservation.');
             return;
          }
       }
    }

    const maxEndTime = new Date(day.date);
    maxEndTime.setHours(this.END_HOUR, 0, 0, 0);

    if (startTime.getTime() >= maxEndTime.getTime() || endTime.getTime() > maxEndTime.getTime()) {
       alert('Cannot reserve outside of working hours.');
       return;
    }

    this.router.navigate(['/reservations/new'], {
      queryParams: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        room: this.selectedRoom
      }
    });
  }

  getDragBoxTop(): number {
    return Math.min(this.dragStartY, this.dragCurrentY);
  }

  getDragBoxHeight(): number {
    return Math.abs(this.dragCurrentY - this.dragStartY);
  }

  // ── History Modal ──────────────────────────────────────────
  openHistoryModal(r: any, event: Event) {
    event.stopPropagation();
    this.historyModalRes = r;
    this.historyModalOpen = true;
    this.historyPageIndex = 0;
    this.historyEvents = [];
    this.historyLoading = true;

    this.reservationsService.getReservationHistory(r.id).subscribe({
      next: (logs: any[]) => {
        this.historyEvents = logs
          .map(log => this.parseHistoryLog(log))
          .filter(log => log.oldRes?.type !== 'BUFFER' && log.newRes?.type !== 'BUFFER');
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
        alert('Could not load history for this reservation.');
      }
    });
  }

  closeHistoryModal() {
    this.historyModalOpen = false;
    this.historyModalRes = null;
    this.historyEvents = [];
  }

  getHistoryUserName(id: number | undefined | null): string {
    if (!id) return 'Unknown';
    return this.usersMap[id]?.name || `User #${id}`;
  }

  parseHistoryLog(log: any) {
    let oldRes: any = null;
    let newRes: any = null;
    if (log.action === 'CREATE_RESERVATION') {
      newRes = log.newValue?.reservation || log.newValue;
    } else if (log.action === 'UPDATE_RESERVATION') {
      oldRes = log.oldValue?.reservation || log.oldValue;
      newRes = log.newValue?.reservation || log.newValue;
    } else if (log.action === 'DELETE_RESERVATION') {
      oldRes = log.oldValue?.reservation || log.oldValue;
    }
    return {
      ...log,
      oldRes,
      newRes,
      actorName: this.getHistoryUserName(log.performedBy),
      isCreation: log.action === 'CREATE_RESERVATION',
      isModification: log.action === 'UPDATE_RESERVATION',
      isSuppression: log.action === 'DELETE_RESERVATION',
    };
  }

  currentHistoryEvent() {
    return this.historyEvents[this.historyPageIndex];
  }

  prevHistoryPage() { if (this.historyPageIndex > 0) this.historyPageIndex--; }
  nextHistoryPage() { if (this.historyPageIndex < this.historyEvents.length - 1) this.historyPageIndex++; }
}
