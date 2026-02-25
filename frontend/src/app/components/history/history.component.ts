import { Component, OnInit } from '@angular/core';
import { ReservationsService } from '../../services/reservations.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  historyLogs: any[] = [];

  constructor(private reservationsService: ReservationsService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory() {
    this.reservationsService.getHistory().subscribe({
      next: (data) => {
        this.historyLogs = data;
      },
      error: () => {
        alert('Error loading history. Make sure you are an ADMIN.');
      }
    });
  }
}
