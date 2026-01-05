import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { SystemInfoService } from './services/system-info.service';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule
  ]
})
export class AppComponent {
  title = 'JS Price Tag & Label Generator';
  isSidenavOpen = false;

  ipAddress$!: Observable<string>;
  now$!: Observable<Date>;

  navLinks = [
    { path: '/', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/label-generator', label: 'Label Generator', icon: 'label', exact: false },
    { path: '/excel-import', label: 'Excel Import', icon: 'upload_file', exact: false },
    { path: '/excel-management', label: 'Excel Management', icon: 'folder_open', exact: false }
  ];

  constructor(private systemInfoService: SystemInfoService) {
    this.ipAddress$ = this.systemInfoService.ipAddress$;
    this.now$ = this.systemInfoService.now$;
  }

  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  closeSidenav(): void {
    this.isSidenavOpen = false;
  }
}
