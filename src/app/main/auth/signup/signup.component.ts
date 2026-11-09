import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { CommonLoaderService } from '../../../services/common-loader.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { CognitoAuthService } from '../../../services/cognito-auth.service';
import { UserVerificationService } from '../../../services/user-verification.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HttpClientModule, CommonModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm!: FormGroup;
  verificationForm!: FormGroup;

  // Multi-step signup state
  currentStep: 'signup' | 'verification' | 'complete' = 'signup';
  signupEmail: string = '';
  signupPassword: string = ''; // Store password for database creation
  signupFirstName: string = ''; // Store firstName for database creation
  signupLastName: string = ''; // Store lastName for database creation

  // Loading and validation states
  isSigningUp = false;
  isVerifying = false;
  isResendingCode = false;

  // Real-time validation feedback
  emailValidation: { isChecking: boolean; isValid: boolean; message: string } = {
    isChecking: false,
    isValid: false,
    message: ''
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private common: CommonService,
    private loader: CommonLoaderService,
    private toastr: ToastrService,
    private cognitoAuth: CognitoAuthService,
    private userVerification: UserVerificationService
  ) { }

  ngOnInit(): void {
    this.initializeForms();
    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Signup form with firstName, lastName, email and password fields
    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.strongPasswordValidator
      ]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: [this.passwordMatchValidator]
    });

    this.verificationForm = this.fb.group({
      verificationCode: ['', [
        Validators.required,
        Validators.pattern(/^\d{6}$/),
        Validators.minLength(6),
        Validators.maxLength(6)
      ]]
    });
  }

  private setupFormValidation(): void {
    // Real-time email validation
    this.signupForm.get('email')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((email: string) => {
        if (email && this.signupForm.get('email')?.valid) {
          this.validateEmailInRealTime(email);
        } else {
          this.emailValidation = { isChecking: false, isValid: false, message: '' };
        }
      });
  }

  // Custom validators
  private strongPasswordValidator(control: any) {
    const password = control.value;
    if (!password) return null;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password);

    const valid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial;

    if (!valid) {
      return {
        strongPassword: {
          hasUpperCase,
          hasLowerCase,
          hasNumeric,
          hasSpecial
        }
      };
    }
    return null;
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private async validateEmailInRealTime(email: string): Promise<void> {
    this.emailValidation = { isChecking: true, isValid: false, message: 'Checking email...' };

    try {
      const result = await this.userVerification.verifyEmail(email).toPromise();

      if (result) {
        if (result.isValid && result.isDeliverable) {
          this.emailValidation = {
            isChecking: false,
            isValid: true,
            message: '✓ Email looks good!'
          };
        } else if (!result.isDeliverable) {
          this.emailValidation = {
            isChecking: false,
            isValid: false,
            message: '⚠ Email address may not be deliverable'
          };
        } else {
          this.emailValidation = {
            isChecking: false,
            isValid: false,
            message: '✗ Please enter a valid email address'
          };
        }
      }
    } catch (error) {
      this.emailValidation = {
        isChecking: false,
        isValid: false,
        message: 'Could not verify email'
      };
    }
  }

  onSignup(): void {
    if (this.signupForm.invalid) {
      this.markFormGroupTouched(this.signupForm);
      this.toastr.warning('Please fill out all required fields correctly.');
      return;
    }

    // Additional validation
    if (!this.emailValidation.isValid && !this.emailValidation.isChecking) {
      this.toastr.warning('Please enter a valid email address.');
      return;
    }

    this.isSigningUp = true;
    this.loader.show();

    const formValue = this.signupForm.value;
    this.signupEmail = formValue.email;
    this.signupPassword = formValue.password; // Store password for database creation
    this.signupFirstName = formValue.firstName; // Store firstName for database creation
    this.signupLastName = formValue.lastName; // Store lastName for database creation

    // User details for Cognito
    const userDetails = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      userType: 'Student', // Default user type
      institution: '' // Empty institution
    };

    this.cognitoAuth.signUp(formValue.email, formValue.password, userDetails)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Cognito signup successful:', result);

          if (!result.userConfirmed) {
            this.currentStep = 'verification';
            this.toastr.info('Please check your email for a verification code.');
          } else {
          }

          this.isSigningUp = false;
          this.loader.hide();
        },
        error: (error) => {
          console.error('Cognito signup failed:', error);
          this.handleSignupError(error);
          this.isSigningUp = false;
          this.loader.hide();
        }
      });
  }

  onVerifyEmail(): void {
    if (this.verificationForm.invalid) {
      this.markFormGroupTouched(this.verificationForm);
      this.toastr.warning('Please enter a valid 6-digit verification code.');
      return;
    }

    this.isVerifying = true;
    this.loader.show();

    const verificationCode = this.verificationForm.value.verificationCode;

    this.cognitoAuth.confirmSignUp(this.signupEmail, verificationCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('Email verification successful, adding user to database...');
            // Now that email is verified, add user to database
            this.addUserToDatabase();
          }
        },
        error: (error) => {
          console.error('Email verification failed:', error);
          this.handleVerificationError(error);
          this.isVerifying = false;
          this.loader.hide();
        }
      });
  }

  private addUserToDatabase(): void {
    const payload = {
      fname: this.signupFirstName,
      lname: this.signupLastName,
      email: this.signupEmail,
      password: this.signupPassword, // Include password for database auth
    };

    this.http.post('https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/user', payload, { withCredentials: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('Database user creation successful:', res);
          this.currentStep = 'complete';
          this.toastr.success('Account created and verified successfully! You can now sign in.');
          this.isVerifying = false;
          this.loader.hide();
        },
        error: (err) => {
          console.error('Database user creation failed:', err);
          if (err.status === 409) {
            // User already exists in database, but email is verified
            this.currentStep = 'complete';
            this.toastr.success('Email verified successfully! You can now sign in.');
          } else {
            this.toastr.error('Email verified but failed to complete registration. Please contact support.');
          }
          this.isVerifying = false;
          this.loader.hide();
        }
      });
  }

  onResendVerificationCode(): void {
    if (this.isResendingCode) return;

    this.isResendingCode = true;

    this.cognitoAuth.resendSignUp(this.signupEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.toastr.info('New verification code sent to your email.');
          }
          this.isResendingCode = false;
        },
        error: (error) => {
          console.error('Failed to resend verification code:', error);
          this.toastr.error('Failed to resend verification code. Please try again.');
          this.isResendingCode = false;
        }
      });
  }

  onGoToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Helper methods for template
  get canProceedToVerification(): boolean {
    return this.signupForm.valid &&
      this.emailValidation.isValid &&
      !this.isSigningUp;
  }

  get canVerifyEmail(): boolean {
    return this.verificationForm.valid && !this.isVerifying;
  }

  getFieldError(fieldName: string, formGroup: FormGroup = this.signupForm): string {
    const field = formGroup.get(fieldName);
    if (field?.errors && (field.dirty || field.touched)) {
      const errors = field.errors;

      if (errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (errors['email']) return 'Please enter a valid email address';
      if (errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
      if (errors['pattern']) {
        if (fieldName === 'verificationCode') {
          return 'Verification code must be 6 digits';
        }
      }
      if (errors['strongPassword']) {
        return this.getPasswordErrorMessage(errors['strongPassword']);
      }
    }

    // Form-level errors
    if (this.signupForm.errors?.['passwordMismatch'] && fieldName === 'confirmPassword') {
      return 'Passwords do not match';
    }

    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      verificationCode: 'Verification code'
    };
    return labels[fieldName] || fieldName;
  }

  private getPasswordErrorMessage(errors: any): string {
    const requirements = [];
    if (!errors.hasUpperCase) requirements.push('uppercase letter');
    if (!errors.hasLowerCase) requirements.push('lowercase letter');
    if (!errors.hasNumeric) requirements.push('number');
    if (!errors.hasSpecial) requirements.push('special character');

    return `Password must include: ${requirements.join(', ')}`;
  }

  private handleSignupError(error: any): void {
    const message = error.message || 'Signup failed';

    if (message.includes('UsernameExistsException') || message.includes('already exists')) {
      this.toastr.error('An account with this email already exists. Please sign in instead.');
    } else if (message.includes('InvalidPasswordException')) {
      this.toastr.error('Password does not meet security requirements.');
    } else {
      this.toastr.error('Signup failed. Please try again.');
    }
  }

  private handleVerificationError(error: any): void {
    const message = error.message || 'Verification failed';

    if (message.includes('CodeMismatchException') || message.includes('Invalid verification code')) {
      this.toastr.error('Invalid verification code. Please check your email and try again.');
    } else if (message.includes('ExpiredCodeException') || message.includes('expired')) {
      this.toastr.error('Verification code has expired. Please request a new one.');
    } else {
      this.toastr.error('Email verification failed. Please try again.');
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Legacy method for backward compatibility - removed duplicate

  // Helper methods for password validation in template
  hasUpperCase(password: string): boolean {
    return /[A-Z]/.test(password || '');
  }

  hasLowerCase(password: string): boolean {
    return /[a-z]/.test(password || '');
  }

  hasNumber(password: string): boolean {
    return /[0-9]/.test(password || '');
  }

  hasSpecialChar(password: string): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password || '');
  }

  hasMinLength(password: string): boolean {
    return (password || '').length >= 8;
  }

  passwordsMatch(): boolean {
    const password = this.signupForm.get('password')?.value;
    const confirmPassword = this.signupForm.get('confirmPassword')?.value;
    return password && confirmPassword && password === confirmPassword;
  }
}
