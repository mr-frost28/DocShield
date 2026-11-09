import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserDetailsService } from '../../../services/user-details.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonService } from '../../../services/common.service';
import { CommonLoaderService } from '../../../services/common-loader.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm!: FormGroup;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private loader: CommonLoaderService,
    private toastr: ToastrService,
    private userDetailsService: UserDetailsService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onLogin(): void {
    this.loader.show();
    setTimeout(() => this.loader.hide(), 2000);
    if (this.loginForm.invalid) {
      this.toastr.warning('Please enter valid credentials')
      this.loader.hide();
      return;
    }
    const { email, password } = this.loginForm.value;
    this.http.post('https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/getUser', this.loginForm.value).subscribe({
      next: (res) => {
        console.log('Login success:', res);
        const username = email.split('@')[0];
        
        // Fetch user details to get the role
        this.userDetailsService.getUserDetails(email).subscribe({
          next: (userDetails) => {
            console.log('User details:', userDetails);
            const userRole = userDetails?.userRole || 'student'; // Use userRole instead of profileType
            this.auth.login(username, email, userRole);
            this.toastr.success('Successfully logged in');
            this.loader.hide();
            this.router.navigate(['/dashboard']);
          },
          error: (userDetailsErr) => {
            console.warn('Failed to fetch user details, logging in without role:', userDetailsErr);
            // Still allow login even if we can't fetch user details
            this.auth.login(username, email);
            this.toastr.success('Successfully logged in');
            this.loader.hide();
            this.router.navigate(['/dashboard']);
          }
        });
      },
      error: (err) => {
        if(err.status === 401) {
          this.toastr.warning('Invalid credentials. Please try again.');
          this.loader.hide();
          return;
        }
        else{
        console.error('Login failed:', err);
        this.loader.hide();
        this.toastr.warning('You do not have an account created. please signup first.');
         this.router.navigate(['/signup']);
        }
      }
    });
  }
}
