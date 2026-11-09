import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

// Interfaces for type safety (will be replaced with actual Amplify imports)
interface CognitoUser {
  username: string;
  attributes: {
    email: string;
    given_name?: string;
    family_name?: string;
    // 'custom:user_type'?: string;
    // 'custom:verification_status'?: string;
    // 'custom:institution'?: string;
  };
  signInUserSession: {
    idToken: {
      jwtToken: string;
      payload: any;
    };
    accessToken: {
      jwtToken: string;
      payload: any;
    };
  };
}

interface SignUpResult {
  user: CognitoUser;
  userConfirmed: boolean;
  userSub: string;
}

interface SignInResult {
  user: CognitoUser;
  isSignedIn: boolean;
}

export interface UserProfile {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  verificationStatus?: string;
  institution?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CognitoAuthService {
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor() {
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state on app startup
   */
  private async initializeAuthState(): Promise<void> {
    try {
      this.setLoading(true);
      
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      
      if (user) {
        const userProfile: UserProfile = {
          username: user.username,
          email: user.signInDetails?.loginId || '',
          firstName: user.username,
          lastName: '',
          userType: 'Student',
          verificationStatus: 'Verified',
          institution: '',
          isEmailVerified: true
        };
        this.setAuthenticatedUser(userProfile);
      } else {
        this.setUnauthenticated();
      }
    } catch (error) {
      console.log('No authenticated user found');
      // Fallback to check local storage
      const currentUser = this.getCurrentUserFromStorage();
      if (currentUser) {
        this.setAuthenticatedUser(currentUser);
      } else {
        this.setUnauthenticated();
      }
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Sign up a new user with email verification
   */
  signUp(email: string, password: string, userDetails: {
    firstName: string;
    lastName: string;
    userType: string;
    institution?: string;
  }): Observable<SignUpResult> {
    this.setLoading(true);
    this.clearError();

    // Real Cognito signup implementation
    const cognitoSignUp = async (): Promise<SignUpResult> => {
      try {
        // Verify Amplify is configured
        const { Amplify } = await import('aws-amplify');
        const config = Amplify.getConfig();
        
        if (!config.Auth?.Cognito?.userPoolId) {
          throw new Error('AWS Amplify Auth not properly configured. Please check your Cognito configuration.');
        }
        
        const { signUp } = await import('aws-amplify/auth');
        
        console.log('🔄 Attempting Cognito signup for:', email);
        
        const signUpResult = await signUp({
          username: email,
          password: password,
          options: {
            userAttributes: {
              email: email,
              given_name: userDetails.firstName,
              family_name: userDetails.lastName,
              // 'custom:user_type': userDetails.userType,
              // 'custom:verification_status': 'Pending',
              // 'custom:institution': userDetails.institution || '',
            },
            autoSignIn: false
          }
        });

        console.log('✅ Cognito signup successful:', signUpResult);

        return {
          user: {
            username: email,
            attributes: {
              email: email,
              given_name: userDetails.firstName,
              family_name: userDetails.lastName,
              // 'custom:user_type': userDetails.userType,
              // 'custom:verification_status': 'Pending',
              // 'custom:institution': userDetails.institution || '',
            },
            signInUserSession: null as any
          },
          userConfirmed: signUpResult.isSignUpComplete,
          userSub: signUpResult.userId || ''
        };
      } catch (error) {
        console.error('❌ Cognito signup failed:', error);
        throw error;
      }
    };

    return from(cognitoSignUp()).pipe(
      tap(() => this.setLoading(false)),
      catchError((error) => {
        this.setError(this.getErrorMessage(error));
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Confirm email verification
   */
  confirmSignUp(email: string, confirmationCode: string): Observable<boolean> {
    this.setLoading(true);
    this.clearError();

    const cognitoConfirmation = async (): Promise<boolean> => {
      const { confirmSignUp } = await import('aws-amplify/auth');
      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode
      });
      return true;
    };

    return from(cognitoConfirmation()).pipe(
      tap(() => this.setLoading(false)),
      catchError((error) => {
        this.setError(this.getErrorMessage(error));
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Resend email verification code
   */
  resendSignUp(email: string): Observable<boolean> {
    this.setLoading(true);

    const cognitoResend = async (): Promise<boolean> => {
      const { resendSignUpCode } = await import('aws-amplify/auth');
      await resendSignUpCode({
        username: email
      });
      return true;
    };

    return from(cognitoResend()).pipe(
      tap(() => this.setLoading(false)),
      catchError((error) => {
        this.setError(this.getErrorMessage(error));
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Sign in user
   */
  signIn(email: string, password: string): Observable<SignInResult> {
    this.setLoading(true);
    this.clearError();

    const cognitoSignIn = async (): Promise<SignInResult> => {
      const { signIn } = await import('aws-amplify/auth');
      const signInResult = await signIn({
        username: email,
        password: password
      });
      
      if (signInResult.isSignedIn) {
        const { getCurrentUser } = await import('aws-amplify/auth');
        const user = await getCurrentUser();
        
        const cognitoUser: CognitoUser = {
          username: user.username,
          attributes: {
            email: user.signInDetails?.loginId || email,
            given_name: user.username,
            family_name: '',
            // 'custom:user_type': 'Student',
            // 'custom:verification_status': 'Verified',
            // 'custom:institution': '',
          },
          signInUserSession: {
            idToken: {
              jwtToken: 'cognito-token',
              payload: {
                sub: user.userId,
                email: user.signInDetails?.loginId || email,
                'custom:user_type': 'Student',
              }
            },
            accessToken: {
              jwtToken: 'cognito-access-token',
              payload: {
                sub: user.userId,
                username: user.username
              }
            }
          }
        };

        return {
          user: cognitoUser,
          isSignedIn: true
        };
      }
      
      throw new Error('Sign in failed');
    };

    return from(cognitoSignIn()).pipe(
      tap((result) => {
        if (result.isSignedIn) {
          const userProfile = this.cognitoUserToProfile(result.user);
          this.setAuthenticatedUser(userProfile);
        }
        this.setLoading(false);
      }),
      catchError((error) => {
        this.setError(this.getErrorMessage(error));
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Sign out user
   */
  signOut(): Observable<boolean> {
    this.setLoading(true);

    const cognitoSignOut = async (): Promise<boolean> => {
      const { signOut } = await import('aws-amplify/auth');
      await signOut();
      return true;
    };

    return from(cognitoSignOut()).pipe(
      tap(() => {
        this.setUnauthenticated();
        this.clearUserFromStorage();
        this.setLoading(false);
      }),
      catchError((error) => {
        this.setError(this.getErrorMessage(error));
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current JWT token
   */
  getCurrentToken(): Observable<string | null> {
    const getCognitoToken = async (): Promise<string | null> => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        return session.tokens?.idToken?.toString() || null;
      } catch (error) {
        console.error('Error getting current token:', error);
        return null;
      }
    };

    return from(getCognitoToken());
  }

  /**
   * Get current user profile
   */
  getCurrentUser(): Observable<UserProfile | null> {
    return this.authState$.pipe(
      map(state => state.user)
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Observable<boolean> {
    return this.authState$.pipe(
      map(state => state.isAuthenticated)
    );
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): Observable<boolean> {
    return this.authState$.pipe(
      map(state => state.user?.userType === role)
    );
  }

  /**
   * Update user profile
   */
  updateUserProfile(updates: Partial<UserProfile>): Observable<UserProfile> {
    this.setLoading(true);

    const cognitoUpdate = async (): Promise<UserProfile> => {
      const { updateUserAttributes, getCurrentUser } = await import('aws-amplify/auth');
      
      const attributeUpdates: any = {};
      if (updates.firstName) attributeUpdates.given_name = updates.firstName;
      if (updates.lastName) attributeUpdates.family_name = updates.lastName;
      if (updates.userType) attributeUpdates['custom:user_type'] = updates.userType;
      if (updates.institution) attributeUpdates['custom:institution'] = updates.institution;
      
      await updateUserAttributes({
        userAttributes: attributeUpdates
      });

      const currentUser = await getCurrentUser();
      const updatedProfile: UserProfile = {
        username: currentUser.username,
        email: currentUser.signInDetails?.loginId || this.authStateSubject.value.user?.email || '',
        firstName: updates.firstName || this.authStateSubject.value.user?.firstName,
        lastName: updates.lastName || this.authStateSubject.value.user?.lastName,
        userType: updates.userType || this.authStateSubject.value.user?.userType,
        institution: updates.institution || this.authStateSubject.value.user?.institution,
        verificationStatus: this.authStateSubject.value.user?.verificationStatus,
        isEmailVerified: true
      };
      
      return updatedProfile;
    };

    return from(cognitoUpdate()).pipe(
      tap((updatedUser) => {
        this.setAuthenticatedUser(updatedUser);
        this.setLoading(false);
      }),
      catchError((error) => {
        this.setError(this.getErrorMessage(error));
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Request password reset
   */
  forgotPassword(email: string): Observable<boolean> {
    this.setLoading(true);

    const cognitoForgotPassword = async (): Promise<boolean> => {
      const { resetPassword } = await import('aws-amplify/auth');
      await resetPassword({
        username: email
      });
      return true;
    };

    return from(cognitoForgotPassword()).pipe(
      tap(() => this.setLoading(false)),
      catchError((error) => {
        this.setError(this.getErrorMessage(error));
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Confirm password reset
   */
  forgotPasswordSubmit(email: string, code: string, newPassword: string): Observable<boolean> {
    this.setLoading(true);

    const cognitoPasswordReset = async (): Promise<boolean> => {
      const { confirmResetPassword } = await import('aws-amplify/auth');
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword
      });
      return true;
    };

    return from(cognitoPasswordReset()).pipe(
      tap(() => this.setLoading(false)),
      catchError((error) => {
        this.setError(this.getErrorMessage(error));
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  // Private helper methods
  private cognitoUserToProfile(cognitoUser: CognitoUser): UserProfile {
    return {
      username: cognitoUser.username,
      email: cognitoUser.attributes.email,
      firstName: cognitoUser.attributes.given_name,
      lastName: cognitoUser.attributes.family_name,
      // userType: cognitoUser.attributes['custom:user_type'],
      // verificationStatus: cognitoUser.attributes['custom:verification_status'],
      // institution: cognitoUser.attributes['custom:institution'],
      isEmailVerified: true, // If user is signed in, email is verified
    };
  }

  private setAuthenticatedUser(user: UserProfile): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      isAuthenticated: true,
      user: user,
      error: null
    });
    this.saveUserToStorage(user);
  }

  private setUnauthenticated(): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      isAuthenticated: false,
      user: null,
      error: null
    });
  }

  private setLoading(isLoading: boolean): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      isLoading: isLoading
    });
  }

  private setError(error: string): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      error: error
    });
  }

  private clearError(): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      error: null
    });
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.code) {
      // Handle common Cognito error codes
      switch (error.code) {
        case 'UserNotConfirmedException':
          return 'Please verify your email address before signing in.';
        case 'NotAuthorizedException':
          return 'Incorrect email or password.';
        case 'UserNotFoundException':
          return 'No account found with this email address.';
        case 'UsernameExistsException':
          return 'An account with this email already exists.';
        case 'InvalidPasswordException':
          return 'Password does not meet security requirements.';
        case 'CodeMismatchException':
          return 'Invalid verification code.';
        case 'ExpiredCodeException':
          return 'Verification code has expired. Please request a new one.';
        default:
          return error.message || 'An unknown error occurred.';
      }
    }
    return 'An unknown error occurred.';
  }

  private saveUserToStorage(user: UserProfile): void {
    try {
      localStorage.setItem('cognito_user_profile', JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to save user to storage:', error);
    }
  }

  private getCurrentUserFromStorage(): UserProfile | null {
    try {
      const stored = localStorage.getItem('cognito_user_profile');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to read user from storage:', error);
      return null;
    }
  }

  private clearUserFromStorage(): void {
    try {
      localStorage.removeItem('cognito_user_profile');
    } catch (error) {
      console.warn('Failed to clear user from storage:', error);
    }
  }

  // Legacy compatibility methods for existing components
  // These maintain compatibility with your existing AuthService
  login(userName: string, email?: string, role?: string): void {
    // This is for backward compatibility - prefer using signIn() instead
    const userProfile: UserProfile = {
      username: userName,
      email: email || userName,
      userType: role || 'Student'
    };
    this.setAuthenticatedUser(userProfile);
  }

  logout(): void {
    // This is for backward compatibility - prefer using signOut() instead
    this.signOut().subscribe();
  }

  isLoggedIn(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  getUser(): string | null {
    return this.authStateSubject.value.user?.username || null;
  }

  getUserEmail(): string | null {
    return this.authStateSubject.value.user?.email || null;
  }

  getUserRole(): string | null {
    return this.authStateSubject.value.user?.userType || null;
  }

  isVerifier(): boolean {
    return this.authStateSubject.value.user?.userType === 'Verifier';
  }

  get userLoggedIn$(): Observable<boolean> {
    return this.isAuthenticated();
  }
}