import { Component, OnInit } from '@angular/core';
import { ReservationsService } from '../../services/reservations.service';
const XLSX = await import('xlsx-js-style');

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

  getWeekNumber(d: Date) {
      const dateCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      dateCopy.setUTCDate(dateCopy.getUTCDate() + 4 - (dateCopy.getUTCDay()||7));
      const yearStart = new Date(Date.UTC(dateCopy.getUTCFullYear(),0,1));
      return Math.ceil(( ( (dateCopy.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
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
        
        const days: Date[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0 && d.getDay() !== 6) {
                days.push(new Date(d));
            }
        }

        if (days.length === 0) {
            alert("No working days in the selected period.");
            return;
        }

        const allRes = [...data];
        // Add pseudo-reservations for Working Hours (Out of Office / Closed)
        for (const d of days) {
            let dayStart = 8;
            let dayEnd = 18;
            for (const rule of this.workingHourRules) {
                const rStart = new Date(rule.startDate); rStart.setHours(0,0,0,0);
                const rEnd = new Date(rule.endDate); rEnd.setHours(23,59,59,999);
                if (d.getTime() >= rStart.getTime() && d.getTime() <= rEnd.getTime()) {
                   dayStart = rule.startHour;
                   dayEnd = rule.endHour;
                   break;
                }
            }
            if (dayStart > 8) {
               allRes.push({
                 type: 'OUT_OF_OFFICE',
                 startTime: new Date(d).setHours(8, 0, 0, 0),
                 endTime: new Date(d).setHours(dayStart, 0, 0, 0),
                 activity: 'Closed',
                 user: { name: 'Admin/System' }
               });
            }
            if (dayEnd < 18) {
               allRes.push({
                 type: 'OUT_OF_OFFICE',
                 startTime: new Date(d).setHours(dayEnd, 0, 0, 0),
                 endTime: new Date(d).setHours(18, 0, 0, 0),
                 activity: 'Closed',
                 user: { name: 'Admin/System' }
               });
            }
        }

        // Dynamically find all unique time boundaries across all reservations to form perfect grid rows
        const timeSet = new Set<number>([8 * 60, 18 * 60]);
        allRes.forEach((r: any) => {
            const s = new Date(r.startTime);
            const e = new Date(r.endTime);
            const isInsideDays = days.some(d => d.getDate() === s.getDate() && d.getMonth() === s.getMonth() && d.getFullYear() === s.getFullYear());
            if (isInsideDays) {
                const sMins = s.getHours() * 60 + s.getMinutes();
                const eMins = e.getHours() * 60 + e.getMinutes();
                if (sMins >= 8 * 60 && sMins <= 18 * 60) timeSet.add(sMins);
                if (eMins >= 8 * 60 && eMins <= 18 * 60) timeSet.add(eMins);
            }
        });

        const sortedTimes = Array.from(timeSet).sort((a,b) => a - b);
        const rowIntervals = [];
        for (let i = 0; i < sortedTimes.length - 1; i++) {
            rowIntervals.push({ start: sortedTimes[i], end: sortedTimes[i+1] });
        }

        const borderAll = {
            top: { style: 'thin', color: { auto: 1 } },
            bottom: { style: 'thin', color: { auto: 1 } },
            left: { style: 'thin', color: { auto: 1 } },
            right: { style: 'thin', color: { auto: 1 } }
        };

        const headerStyle = {
            fill: { fgColor: { rgb: "FF808080" } }, // Dark grey
            font: { bold: true, color: { rgb: "FFFFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderAll
        };

        const subHeaderStyle = {
            fill: { fgColor: { rgb: "FFD9D9D9" } }, // Light grey
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderAll
        };

        const timeStyle = {
            fill: { fgColor: { rgb: "FFF2F2F2" } },
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderAll
        };

        const resStyle = {
            fill: { fgColor: { rgb: "FFFFFFFF" } },
            font: { sz: 10 },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: borderAll
        };

        const emptyStyle = {
            fill: { fgColor: { rgb: "FFB4C6E7" } }, // Blueish empty slot
            border: borderAll
        };

        const closedStyle = {
            fill: { fgColor: { rgb: "FFFF0000" } }, // Red
            font: { bold: true, color: { rgb: "FFFFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderAll
        };

        const aoa: any[][] = [];
        const merges: any[] = [];

        // Header Rows
        const row0 = [{ v: this.exportRoom, s: headerStyle }];
        for (let i = 0; i < days.length; i++) {
            row0.push({ v: `CW${this.getWeekNumber(days[i])}`, s: headerStyle });
        }
        
        let startCol = 1;
        for (let c = 1; c < row0.length; c++) {
            if (c === row0.length - 1 || row0[c].v !== row0[c+1]?.v) {
                if (c > startCol) {
                    merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: c } });
                }
                startCol = c + 1;
            }
        }

        const row1 = [{ v: '', s: subHeaderStyle }];
        for (const d of days) {
            row1.push({ v: d.toLocaleDateString('en-US', { weekday: 'long' }), s: subHeaderStyle });
        }

        const row2 = [{ v: '', s: subHeaderStyle }];
        for (const d of days) {
            row2.push({ v: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`, s: subHeaderStyle });
        }

        aoa.push(row0, row1, row2);

        const formatTime = (mins: number) => {
            const h = Math.floor(mins / 60).toString().padStart(2, '0');
            const m = (mins % 60).toString().padStart(2, '0');
            return `${h}:${m}`;
        };

        const skipCell = Array(rowIntervals.length).fill(null).map(() => Array(days.length).fill(null));

        for (let rIdx = 0; rIdx < rowIntervals.length; rIdx++) {
            const interval = rowIntervals[rIdx];
            const row: any[] = [{ v: `${formatTime(interval.start)} -> ${formatTime(interval.end)}`, s: timeStyle }];
            
            for (let cIdx = 0; cIdx < days.length; cIdx++) {
                const d = days[cIdx];
                
                if (skipCell[rIdx][cIdx]) {
                    row.push({ v: '', s: skipCell[rIdx][cIdx] });
                    continue;
                }

                const res = allRes.find((res: any) => {
                    const rs = new Date(res.startTime);
                    const re = new Date(res.endTime);
                    if (rs.getDate() !== d.getDate() || rs.getMonth() !== d.getMonth() || rs.getFullYear() !== d.getFullYear()) return false;
                    
                    const rsMins = rs.getHours() * 60 + rs.getMinutes();
                    const reMins = re.getHours() * 60 + re.getMinutes();
                    
                    return rsMins <= interval.start && reMins >= interval.end;
                });

                if (res) {
                    let span = 0;
                    for (let i = rIdx; i < rowIntervals.length; i++) {
                        const rs = new Date(res.startTime);
                        const re = new Date(res.endTime);
                        const rsMins = rs.getHours() * 60 + rs.getMinutes();
                        const reMins = re.getHours() * 60 + re.getMinutes();
                        
                        if (rsMins <= rowIntervals[i].start && reMins >= rowIntervals[i].end) {
                            span++;
                        } else break;
                    }
                    
                    let text = '';
                    let style: any = resStyle;

                    if (res.type === 'OUT_OF_OFFICE') {
                        text = 'CLOSED';
                        style = closedStyle;
                    } else if (res.type === 'BUFFER') {
                        text = ''; 
                        style = emptyStyle;
                    } else {
                        text = `${res.user?.name || 'Unknown'}\n`;
                        if (res.hardware && res.hardware !== '-') text += `HW: ${res.hardware}\n`;
                        if (res.software && res.software !== '-') text += `SW: ${res.software}\n`;
                        text += `Activity: ${res.activity}`;
                        if (res.isHardwareOnly) text = `[HW] ${text}`;
                        style = resStyle;
                    }

                    for (let i = rIdx + 1; i < rIdx + span; i++) {
                        skipCell[i][cIdx] = style;
                    }
                    
                    row.push({ v: text, s: style });
                    
                    if (span > 1) {
                        merges.push({
                            s: { r: rIdx + 3, c: cIdx + 1 },
                            e: { r: rIdx + 3 + span - 1, c: cIdx + 1 }
                        });
                    }
                } else {
                    row.push({ v: '', s: emptyStyle });
                }
            }
            aoa.push(row);
        }

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        
        ws['!cols'] = [{ wch: 15 }];
        for (let i = 0; i < days.length; i++) ws['!cols'].push({ wch: 22 });
        
        ws['!merges'] = merges;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reservations');
        XLSX.writeFile(wb, `reservations_${this.exportRoom}_${this.exportStart}_to_${this.exportEnd}.xlsx`);
      },
      error: () => alert('Error loading reservations for export')
    });
  }
}
