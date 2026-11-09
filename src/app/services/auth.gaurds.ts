import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.auth.isLoggedIn()) return true;
    // not logged in → go to login
    return this.router.parseUrl('/login');
  }
}

@Injectable({ providedIn: 'root' })
export class VerifierGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isLoggedIn()) {
      // not logged in → go to login
      return this.router.parseUrl('/login');
    }
    
    if (this.auth.isVerifier()) {
      return true;
    }
    
    // logged in but not a verifier → go to dashboard with access denied
    return this.router.parseUrl('/dashboard');
  }
}
