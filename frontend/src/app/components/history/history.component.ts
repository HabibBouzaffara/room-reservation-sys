import { Component, OnInit } from '@angular/core';
import { ReservationsService } from '../../services/reservations.service';

@Component({
  standalone: false,
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  /** Grouped by reservation ID — one card per slot */
  reservationGroups: any[] = [];
  usersMap: Record<number, any> = {};

  constructor(private reservationsService: ReservationsService) {}

  ngOnInit(): void {
    this.loadUsersAndHistory();
  }

  loadUsersAndHistory() {
    this.reservationsService.getUsers().subscribe({
      next: (users: any[]) => {
        users.forEach(u => (this.usersMap[u.id] = u));
        this.loadHistory();
      },
      error: () => this.loadHistory()
    });
  }

  loadHistory() {
    this.reservationsService.getHistory().subscribe({
      next: (data: any[]) => {
        // Parse and filter buffers
        const parsed = data
          .map(log => this.parseLog(log))
          .filter(log => log.oldRes?.type !== 'BUFFER' && log.newRes?.type !== 'BUFFER');

        // Group by reservationId
        const groupMap: Record<number, any> = {};
        for (const log of parsed) {
          const rid = log.reservationId;
          if (!groupMap[rid]) {
            groupMap[rid] = {
              reservationId: rid,
              room: log.room,
              events: [],
              pageIndex: 0  // pagination state per card
            };
          }
          groupMap[rid].events.push(log);
        }

        // Sort events within each group chronologically (oldest first)
        this.reservationGroups = Object.values(groupMap).map(g => {
          g.events.sort((a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          return g;
        });

        // Sort groups: most recently touched first
        this.reservationGroups.sort((a, b) => {
          const lastA = a.events[a.events.length - 1]?.timestamp;
          const lastB = b.events[b.events.length - 1]?.timestamp;
          return new Date(lastB).getTime() - new Date(lastA).getTime();
        });
      },
      error: () => alert('Error loading history. Make sure you are an ADMIN.')
    });
  }

  getUserName(id: number | undefined | null): string {
    if (!id) return 'Unknown';
    return this.usersMap[id]?.name || `User #${id}`;
  }

  parseLog(log: any) {
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

    const modifierId = log.performedBy;
    const ownerId = oldRes?.userId || newRes?.userId || modifierId;

    return {
      ...log,
      modifierName: this.getUserName(modifierId),
      ownerName: this.getUserName(ownerId),
      oldRes,
      newRes,
      isModification: log.action === 'UPDATE_RESERVATION',
      isSuppression: log.action === 'DELETE_RESERVATION',
      isCreation: log.action === 'CREATE_RESERVATION',
      room: oldRes?.room || newRes?.room || '—'
    };
  }

  /** Current visible event for a group */
  currentEvent(group: any) {
    return group.events[group.pageIndex];
  }

  prevEvent(group: any) {
    if (group.pageIndex > 0) group.pageIndex--;
  }

  nextEvent(group: any) {
    if (group.pageIndex < group.events.length - 1) group.pageIndex++;
  }
}
