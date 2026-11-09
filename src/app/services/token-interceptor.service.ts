import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { CognitoAuthService } from './cognito-auth.service';

@Injectable({
  providedIn: 'root'
})
export class TokenInterceptorService implements HttpInterceptor {
  private cognitoAuth!: CognitoAuthService;

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Get the service lazily to avoid circular dependencies
    if (!this.cognitoAuth) {
      this.cognitoAuth = this.injector.get(CognitoAuthService);
    }

    // List of URLs that don't need authentication
    const publicUrls = [
      '/signup',
      '/login',
      '/forgot-password',
      'cognito',
      'amazonaws.com'
    ];

    // Check if this is a public URL that doesn't need token
    const isPublicUrl = publicUrls.some(url => req.url.includes(url));
    
    if (isPublicUrl) {
      return next.handle(req);
    }

    // Get current token from Cognito
    return this.cognitoAuth.getCurrentToken().pipe(
      switchMap(token => {
        if (token) {
          // Clone request and add Authorization header with Bearer token
          const tokenReq = req.clone({
            setHeaders: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          return next.handle(tokenReq);
        } else {
          // No token available, proceed without Authorization header
          // This might trigger a 401 response which should redirect to login
          return next.handle(req);
        }
      }),
      catchError(error => {
        console.error('Error getting token for request:', error);
        // If token retrieval fails, proceed without token
        return next.handle(req);
      })
    );
  }
}
