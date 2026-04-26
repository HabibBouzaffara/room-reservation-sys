import { Component, OnInit } from '@angular/core';
import { ReservationsService } from '../../services/reservations.service';

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

  rooms: string[] = ['IPB', 'BCP', 'BDC'];
  selectedRoom: string = 'IPB';

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
}
