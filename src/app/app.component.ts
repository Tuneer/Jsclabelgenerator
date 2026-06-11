import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemInfoService } from './services/system-info.service';
import { AuthService, CurrentUser } from './services/auth.service';

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
    MatListModule,
    MatTooltipModule
  ]
})
export class AppComponent {
  title = 'JS Price Tag & Label Generator';
  isSidenavOpen = false;
  currentUser: CurrentUser | null = null;
  isAdmin = false;

  ipAddress$!: Observable<string>;
  now$!: Observable<Date>;

  allNavLinks = [
    { path: '/', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/label-generator', label: 'Label Generator', icon: 'label', exact: false },
    { path: '/coupon-generator', label: 'Coupon Generator', icon: 'confirmation_number', exact: false },
    { path: '/excel-import', label: 'Excel Import', icon: 'upload_file', exact: false, adminOnly: true },
    { path: '/excel-management', label: 'Excel Management', icon: 'folder_open', exact: false, adminOnly: true }
  ];

  navLinks = this.allNavLinks;

  constructor(
    private systemInfoService: SystemInfoService,
    private authService: AuthService,
    private router: Router
  ) {
    this.ipAddress$ = this.systemInfoService.ipAddress$;
    this.now$ = this.systemInfoService.now$;
    
    // Subscribe to current user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'admin';
      this.updateNavLinks();
    });
  }

  private updateNavLinks(): void {
    // Filter nav links based on user role
    if (this.isAdmin) {
      this.navLinks = this.allNavLinks;
    } else {
      this.navLinks = this.allNavLinks.filter(link => !link.adminOnly);
    }
  }

  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  closeSidenav(): void {
    this.isSidenavOpen = false;
  }

  onLogout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
