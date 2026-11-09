import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private readonly storageKey = 'isLoggedIn';
  private readonly userKey = 'userName';
  private readonly emailKey = 'userEmail';
  private readonly roleKey = 'userRole';

  // BehaviorSubject will hold login state
  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  userLoggedIn$ = this.loggedInSubject.asObservable();

  constructor() {}

  /** Login and update state */
  /** Login and update state */
  login(userName: string, email?: string, role?: string): void {
    localStorage.setItem(this.storageKey, 'true');
    localStorage.setItem(this.userKey, userName);
    if (email) {
      localStorage.setItem(this.emailKey, email);
    }
    if (role) {
      localStorage.setItem(this.roleKey, role);
    }
    this.loggedInSubject.next(true);
  }

  /** Logout and update state */
  logout(): void {
    localStorage.setItem(this.storageKey, 'false');
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.emailKey);
    localStorage.removeItem(this.roleKey);
    this.loggedInSubject.next(false);
  }

  /** Synchronous check */
  isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }

  /** Get current user */
  getUser(): string | null {
    return localStorage.getItem(this.userKey);
  }

  /** Get current user email */
  getUserEmail(): string | null {
    return localStorage.getItem(this.emailKey);
  }

  /** Get current user role */
  getUserRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  /** Check if user has verifier role */
  isVerifier(): boolean {
    return this.getUserRole() === 'Verifier';
  }

  /** Helper: check persisted state */
  private hasToken(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }
}
