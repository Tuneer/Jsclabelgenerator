import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  username: string;
  password: string;
  role: string;
  displayName: string;
}

export interface AuthCredentials {
  users: User[];
  lastModified: string;
  note: string;
}

export interface CurrentUser {
  username: string;
  role: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private credentials: AuthCredentials | null = null;
  private readonly STORAGE_KEY = 'jsclabel_auth_user';

  constructor(private http: HttpClient) {
    this.loadCredentials();
    this.restoreSession();
  }

  private loadCredentials(): void {
    // Load credentials from JSON file
    this.http.get<AuthCredentials>('/assets/auth-credentials.json').subscribe({
      next: (credentials) => {
        this.credentials = credentials;
        console.log('✅ Auth credentials loaded:', credentials.users.length, 'users');
      },
      error: (err) => {
        console.error('❌ Failed to load auth credentials:', err);
      }
    });
  }

  private restoreSession(): void {
    // Check if user was previously logged in (session persistence)
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as CurrentUser;
        this.currentUserSubject.next(user);
        console.log(' Session restored for:', user.displayName);
      } catch (e) {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  login(username: string, password: string): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      // Wait for credentials to load if not ready
      if (!this.credentials) {
        // Retry after a short delay
        setTimeout(() => {
          this.performLogin(username, password, observer);
        }, 500);
      } else {
        this.performLogin(username, password, observer);
      }
    });
  }

  private performLogin(username: string, password: string, observer: any): void {
    if (!this.credentials) {
      observer.error(new Error('Credentials not loaded'));
      return;
    }

    const user = this.credentials.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (user) {
      const currentUser: CurrentUser = {
        username: user.username,
        role: user.role,
        displayName: user.displayName
      };
      
      // Store in localStorage for session persistence
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentUser));
      
      this.currentUserSubject.next(currentUser);
      observer.next(true);
      observer.complete();
      console.log('✅ Login successful:', currentUser.displayName);
    } else {
      observer.next(false);
      observer.complete();
      console.log('❌ Login failed: Invalid credentials');
    }
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSubject.next(null);
    console.log('👋 User logged out');
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }
}
