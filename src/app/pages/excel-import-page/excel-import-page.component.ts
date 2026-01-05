import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ExcelImportComponent } from '../../components/excel-import/excel-import.component';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-excel-import-page',
  templateUrl: './excel-import-page.component.html',
  styleUrls: ['./excel-import-page.component.css'],
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, ExcelImportComponent]
})
export class ExcelImportPageComponent implements OnInit, OnDestroy {
  currentDateTime: string = '';
  ipAddress: string = 'Loading...';
  private dateTimeInterval: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.updateDateTime();
    this.fetchIPAddress();
    
    this.dateTimeInterval = setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }

  private updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };
    this.currentDateTime = now.toLocaleString('en-US', options);
  }

  private fetchIPAddress(): void {
    this.http.get<any>('https://api.ipify.org?format=json').subscribe({
      next: (response) => {
        this.ipAddress = response.ip;
      },
      error: () => {
        this.ipAddress = 'N/A';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.dateTimeInterval) {
      clearInterval(this.dateTimeInterval);
    }
  }
}
