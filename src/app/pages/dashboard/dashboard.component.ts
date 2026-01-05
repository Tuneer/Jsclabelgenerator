import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { IndexedDBService } from '../../services/indexed-db.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule, HttpClientModule]
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentDateTime: string = '';
  ipAddress: string = 'Loading...';
  indexedDBStatus: string = 'Checking...';
  sqlDBStatus: string = 'Checking...';
  private dateTimeInterval: any;
  navigationCards = [
    {
      title: 'Label Generator',
      description: 'Filter items, edit details, and generate price tags and labels for printing',
      icon: 'label',
      route: '/label-generator',
      color: '#1976d2'
    },
    {
      title: 'Excel Import',
      description: 'Upload and import item data from Excel files to local database',
      icon: 'upload_file',
      route: '/excel-import',
      color: '#388e3c'
    },
    {
      title: 'Excel Management',
      description: 'View, manage, and select uploaded Excel files for label generation',
      icon: 'folder_open',
      route: '/excel-management',
      color: '#f57c00'
    }
  ];

  constructor(
    private http: HttpClient,
    private indexedDBService: IndexedDBService
  ) {}

  ngOnInit(): void {
    this.updateDateTime();
    this.fetchIPAddress();
    this.checkDatabaseServices();
    
    // Update time every second
    this.dateTimeInterval = setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateTimeInterval) {
      clearInterval(this.dateTimeInterval);
    }
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
    // Try to fetch public IP
    this.http.get<any>('https://api.ipify.org?format=json').subscribe({
      next: (response) => {
        this.ipAddress = response.ip;
      },
      error: () => {
        // Fallback to showing local/unknown
        this.ipAddress = 'N/A';
      }
    });
  }

  private async checkDatabaseServices(): Promise<void> {
    // Check IndexedDB
    try {
      await this.indexedDBService.init();
      this.indexedDBStatus = '✅ Available';
    } catch (error) {
      this.indexedDBStatus = '❌ Error';
      console.error('IndexedDB init error:', error);
    }

    // SQL.js status - requires custom webpack configuration for Angular 21
    this.sqlDBStatus = '🚧 Not configured (Angular 21 webpack issue)';
  }
}
