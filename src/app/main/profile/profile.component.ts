import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { UserDetailsService } from '../../services/user-details.service';
import { CommonLoaderService } from '../../services/common-loader.service';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditProfileDialogComponent } from '../edit-profile-dialog/edit-profile-dialog.component';
import { ChangePasswordDialogComponent } from '../change-password-dialog/change-password-dialog.component';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})

export class ProfileComponent implements OnInit {

  userName = '';
  userEmail = '';
  totalDocs = 5;   // example numbers
  verifiedDocs = 3;
  pendingDocs = 2;

  documents = [
    { name: 'Aadhaar.pdf', type: 'ID Proof', status: 'Verified', uploadedOn: new Date() },
    { name: 'Resume.pdf', type: 'Resume', status: 'Pending', uploadedOn: new Date() }
  ];

  constructor(
    private router: Router, 
    public auth: AuthService, 
    private userDetailsService: UserDetailsService,
    private http: HttpClient,
    private loader: CommonLoaderService,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const userEmail = this.auth.getUserEmail?.() || this.auth.getUser?.();
    if (!userEmail) {
      this.userName = 'User';
      this.userEmail = '';
      return;
    }

    this.userEmail = userEmail;
    this.loader.show();
    this.userDetailsService.getUserDetails(userEmail).subscribe({
      next: (data) => {
        if (data?.fname || data?.lname) {
          this.userName = `${data.fname || ''} ${data.lname || ''}`.trim();
        } else {
          this.userName = data?.email || 'User';
        }
        this.loader.hide();
      },
      error: (err) => {
        console.error('Failed to fetch user details', err);
        this.userName = 'User';
        this.toastr.error('Failed to load user details');
        this.loader.hide();
      }
    });
  }

  onUpload() {
    this.router.navigate(['/upload']);
  }


  onEditProfile() {
    if (!this.userEmail) {
      this.toastr.error('User email not available');
      return;
    }

    this.loader.show();
    this.userDetailsService.getUserDetails(this.userEmail).subscribe({
      next: (userDetails) => {
        this.loader.hide();
        
        const dialogRef = this.dialog.open(EditProfileDialogComponent, {
          width: '600px',          // default width
          maxWidth: '90vw',        // responsive max width
          maxHeight: '90vh',       // responsive max height
          panelClass: 'custom-dialog-container', // custom class for styling
          disableClose: false,
          autoFocus: true,
          restoreFocus: true,
          data: {
            fname: userDetails?.fname || '',
            lname: userDetails?.lname || '',
            email: this.userEmail,
            phone: userDetails?.phone || '',
            profileType: userDetails?.profileType || '',
            Designation: userDetails?.designation || '',
            Organization: userDetails?.organization || '',
            educationLevel: userDetails?.educationLevel || '',
            degreeName: userDetails?.degreeName || ''
          }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
          if (!result) return;

          // Update the displayed user name if profile was updated
          if (result.fname || result.lname) {
            this.userName = `${result.fname || ''} ${result.lname || ''}`.trim();
          }
          this.toastr.success('Profile updated successfully');
        });
      },
      error: (err) => {
        console.error('Failed to fetch user details for editing', err);
        this.loader.hide();
        this.toastr.error('Failed to load user details');
        
        // Fallback: open dialog with basic info
        const [firstName, lastName] = this.userName.split(' ');
        const dialogRef = this.dialog.open(EditProfileDialogComponent, {
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          panelClass: 'custom-dialog-container',
          disableClose: false,
          autoFocus: true,
          restoreFocus: true,
          data: {
            fname: firstName || '',
            lname: lastName || '',
            email: this.userEmail,
            phone: ''
          }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
          if (!result) return;
          if (result.fname || result.lname) {
            this.userName = `${result.fname || ''} ${result.lname || ''}`.trim();
          }
          this.toastr.success('Profile updated successfully');
        });
      }
    });
  }

  onChangePassword() {
    const dialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      width: '600px',          // default width
      maxWidth: '90vw',        // responsive max width
      maxHeight: '90vh',       // responsive max height
      panelClass: 'custom-dialog-container', // custom class for styling
      disableClose: false,
      autoFocus: true,
      restoreFocus: true,
      data: {
        email: this.userEmail
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.toastr.success('Password changed successfully');
      }
    });
  }
}
