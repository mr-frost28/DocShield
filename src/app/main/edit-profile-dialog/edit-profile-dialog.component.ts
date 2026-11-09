import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { API_CONFIG } from '../../config/api.config';

@Component({
  selector: 'app-edit-profile-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatOptionModule,
    MatSelectModule,
    HttpClientModule
  ],
  templateUrl: './edit-profile-dialog.component.html',
  styleUrls: ['./edit-profile-dialog.component.scss']
})
export class EditProfileDialogComponent {
  profileForm: FormGroup;
  professionalForm: FormGroup;
  AacademicForm: FormGroup;
  isLoading = false;
  
  profileTypes = [
    { value: 'student', label: 'Student' },
    { value: 'jobSeeker', label: 'Job Seeker' },
    { value: 'verifier', label: 'Verifier' },
  ];

  educationLevels = [
    { value: 'highSchool', label: 'High School' },
    { value: 'bachelors', label: "Bachelor's" },
    { value: 'masters', label: "Master's" },
    { value: 'phd', label: 'PhD' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditProfileDialogComponent>,
    private http: HttpClient,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.profileForm = this.fb.group({
      fname: [data?.fname || '', Validators.required],
      lname: [data?.lname || '', Validators.required],
      email: [{ value: data?.email || '', disabled: true }], // email usually not editable
      phone: [data?.phone || '']
    });

    this.professionalForm = this.fb.group({
      profileType: [data?.profileType || ''],
      Designation: [data?.Designation || ''],
      Organization: [data?.Organization || ''],
    });

    this.AacademicForm = this.fb.group({
      educationLevel: [data?.educationLevel || ''],
      degreeName: [data?.degreeName || '']
    });
  }

  onSave(): void {
    if (this.profileForm.valid && this.professionalForm.valid && this.AacademicForm.valid) {
      this.isLoading = true;

      const payload = {
        email: this.auth.getUserEmail(),
        fname: this.profileForm.get('fname')?.value,
        lname: this.profileForm.get('lname')?.value,
        phone: this.profileForm.get('phone')?.value,
        profileType: this.professionalForm.get('profileType')?.value,
        designation: this.professionalForm.get('Designation')?.value,
        organization: this.professionalForm.get('Organization')?.value,
        educationLevel: this.AacademicForm.get('educationLevel')?.value,
        degreeName: this.AacademicForm.get('degreeName')?.value
      };

      this.http.post('https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/update_profile', payload).subscribe({
        next: (response: any) => {
          console.log('Profile updated successfully:', response);
          
          // Update the role in auth service if profile type was changed
          const currentRole = this.auth.getUserRole();
          const newRole = payload.profileType;
          if (currentRole !== newRole && newRole) {
            // Update the role in localStorage by re-logging the user with the new role
            const currentUser = this.auth.getUser();
            const currentEmail = this.auth.getUserEmail();
            if (currentUser && currentEmail) {
              this.auth.login(currentUser, currentEmail, newRole);
            }
          }
          
          this.isLoading = false;
          this.dialogRef.close(payload);
        },
        error: (error: any) => {
          console.error('Error updating profile:', error);
          console.error('Error details:', error.error);
          console.error('Status:', error.status);
          console.error('Status text:', error.statusText);
          this.isLoading = false;
          alert('Failed to update profile. Please try again later.');
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  isEducationLevelSelected(): boolean {
    return !!this.AacademicForm.get('educationLevel')?.value;
  }
}
