import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserDetailsService } from '../../services/user-details.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonLoaderService } from '../../services/common-loader.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HttpClientModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  totalDocuments: number = 0;
  pendingVerifications: number = 0;
  VerifiedDocuments: number = 0;
  userName!: string | null;

  constructor(
    private router: Router, 
    public auth: AuthService, 
    private userDetailsService: UserDetailsService,
    private http: HttpClient,
    private loader: CommonLoaderService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const userEmail = this.auth.getUserEmail ? this.auth.getUserEmail() : this.auth.getUser();
    if (!userEmail) {
      this.userName = 'User';
      return;
    }

    this.loader.show();
    this.userDetailsService.getUserDetails(userEmail).subscribe({
      next: (data) => {
        if (data?.fname || data?.lname) {
          this.userName = `${data.fname || ''} ${data.lname || ''}`.trim();
        } else {
          this.userName = data?.email || 'User';
        }
       // this.toastr.success('User details loaded successfully');
        this.loader.hide();
      },
      error: (err) => {
        console.error('Failed to fetch user details', err);
        this.userName = 'User';
        this.toastr.error('Failed to load user details');
        this.loader.hide();
      }
    });

    this.fetchDashboardStats(userEmail);
  }

  fetchDashboardStats(userEmail: string): void {
    this.loader.show();
    this.http.get<any>(`https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/get_document_count?userEmail=${userEmail}`).subscribe({
      next: (res) => {
        console.log('Dashboard stats response:', res);
        this.totalDocuments = res.totalDocuments ?? 0;
        this.pendingVerifications = res.pendingVerification ?? 0; 
        this.VerifiedDocuments = res.verifiedDocuments ?? 0;
       // this.toastr.success('Dashboard stats loaded successfully');
        this.loader.hide();
      },
      error: (err) => {
        console.error('Failed to fetch dashboard stats', err);
        this.totalDocuments = 0;
        this.pendingVerifications = 0;
        this.VerifiedDocuments = 0;
        this.toastr.error('Failed to load dashboard stats');
        this.loader.hide();
      }
    });
  }

  goToLearnMore(): void {
    this.router.navigate(['/learn-more']);
  }

  isVerifier(): boolean {
    return this.auth.isVerifier();
  }
}
