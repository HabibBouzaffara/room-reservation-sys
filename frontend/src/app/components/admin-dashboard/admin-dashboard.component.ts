import { Component, OnInit } from '@angular/core';
import { ReservationsService } from '../../services/reservations.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  users: any[] = [];
  hardwareList: any[] = [];
  softwareList: any[] = [];
  
  newHardware: string = '';
  newSoftware: string = '';

  constructor(private reservationsService: ReservationsService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadHardware();
    this.loadSoftware();
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
    this.reservationsService.getHardware().subscribe(data => this.hardwareList = data);
  }

  addHardware() {
    if (!this.newHardware) return;
    this.reservationsService.addHardware(this.newHardware).subscribe(() => {
      this.newHardware = '';
      this.loadHardware();
    });
  }

  deleteHardware(id: number) {
    this.reservationsService.deleteHardware(id).subscribe(() => this.loadHardware());
  }

  loadSoftware() {
    this.reservationsService.getSoftware().subscribe(data => this.softwareList = data);
  }

  addSoftware() {
    if (!this.newSoftware) return;
    this.reservationsService.addSoftware(this.newSoftware).subscribe(() => {
      this.newSoftware = '';
      this.loadSoftware();
    });
  }

  deleteSoftware(id: number) {
    this.reservationsService.deleteSoftware(id).subscribe(() => this.loadSoftware());
  }
}
