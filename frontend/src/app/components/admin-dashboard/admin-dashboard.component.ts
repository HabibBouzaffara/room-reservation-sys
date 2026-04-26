import { Component, OnInit } from '@angular/core';
import { ReservationsService } from '../../services/reservations.service';
import * as XLSX from 'xlsx';

@Component({
  standalone: false,
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  users: any[] = [];
  hardwareList: any[] = [];
  softwareList: any[] = [];
  
  newHardware: string = '';
  newHardwareQty: number = 1;
  newSoftware: string = '';
  
  workingHourRules: any[] = [];
  newRuleStart: string = '';
  newRuleEnd: string = '';
  newRuleStartHour: number = 8;
  newRuleEndHour: number = 17;

  rooms: string[] = ['IPB', 'BCP1', 'BCP2', 'BDC1', 'BDC2'];
  selectedRoom: string = 'IPB';
  
  exportRoom: string = 'IPB';
  exportStart: string = '';
  exportEnd: string = '';

  constructor(private reservationsService: ReservationsService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadSysconfigData();
  }

  setRoom(room: string) {
    this.selectedRoom = room;
    this.loadSysconfigData();
  }

  loadSysconfigData() {
    this.loadHardware();
    this.loadSoftware();
    this.loadWorkingHours();
  }

  loadWorkingHours() {
    this.reservationsService.getWorkingHours().subscribe(data => {
      this.workingHourRules = Array.isArray(data) ? data : [];
    });
  }

  addWorkingHourRule() {
    if (!this.newRuleStart || !this.newRuleEnd || !this.newRuleStartHour || !this.newRuleEndHour) return;
    
    const newRule = {
      startDate: this.newRuleStart,
      endDate: this.newRuleEnd,
      startHour: this.newRuleStartHour,
      endHour: this.newRuleEndHour
    };
    
    const updatedRules = [...this.workingHourRules, newRule];
    this.reservationsService.setWorkingHours(updatedRules).subscribe(() => {
       this.loadWorkingHours();
       this.newRuleStart = '';
       this.newRuleEnd = '';
    });
  }

  deleteWorkingHourRule(index: number) {
    const updatedRules = this.workingHourRules.filter((_, i) => i !== index);
    this.reservationsService.setWorkingHours(updatedRules).subscribe(() => {
       this.loadWorkingHours();
    });
  }

  loadUsers() {
    this.reservationsService.getUsers().subscribe(data => this.users = data);
  }

  approveUser(userId: number) {
    this.reservationsService.approveUser(userId).subscribe(() => {
      this.loadUsers();
    });
  }

  loadHardware() {
    this.reservationsService.getHardware(this.selectedRoom).subscribe(data => this.hardwareList = data);
  }

  addHardware() {
    if (!this.newHardware) return;
    this.reservationsService.addHardware(this.newHardware, this.selectedRoom, this.newHardwareQty).subscribe(() => {
      this.newHardware = '';
      this.newHardwareQty = 1;
      this.loadHardware();
    });
  }

  deleteHardware(id: number) {
    this.reservationsService.deleteHardware(id).subscribe(() => this.loadHardware());
  }

  loadSoftware() {
    this.reservationsService.getSoftware(this.selectedRoom).subscribe(data => this.softwareList = data);
  }

  addSoftware() {
    if (!this.newSoftware) return;
    this.reservationsService.addSoftware(this.newSoftware, this.selectedRoom).subscribe(() => {
      this.newSoftware = '';
      this.loadSoftware();
    });
  }

  deleteSoftware(id: number) {
    this.reservationsService.deleteSoftware(id).subscribe(() => this.loadSoftware());
  }

  exportExcel() {
    if (!this.exportStart || !this.exportEnd) {
      alert('Please select start and end dates.');
      return;
    }
    
    this.reservationsService.getReservations(this.exportRoom).subscribe({
      next: (data) => {
        const start = new Date(this.exportStart);
        start.setHours(0,0,0,0);
        const end = new Date(this.exportEnd);
        end.setHours(23,59,59,999);
        
        const filtered = data.filter((r: any) => {
           const rStart = new Date(r.startTime);
           return rStart >= start && rStart <= end;
        });

        if (filtered.length === 0) {
           alert('No reservations found for this period.');
           return;
        }

        const exportData = filtered.map((r: any) => ({
           'Room': r.room || this.exportRoom,
           'User': r.user?.name || 'Unknown',
           'Activity': r.activity,
           'Start Time': new Date(r.startTime).toLocaleString(),
           'End Time': new Date(r.endTime).toLocaleString(),
           'Hardware': r.hardware || '-',
           'Software': r.software || '-',
           'Is Hardware Only': r.isHardwareOnly ? 'Yes' : 'No'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reservations');
        XLSX.writeFile(wb, `reservations_${this.exportRoom}_${this.exportStart}_to_${this.exportEnd}.xlsx`);
      },
      error: () => alert('Error loading reservations for export')
    });
  }
}
