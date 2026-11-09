import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonLoaderService } from '../../services/common-loader.service';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
      CommonModule, 
      ReactiveFormsModule, 
      MatDialogModule,
      MatFormFieldModule,
      MatInputModule,
      MatButtonModule,
      MatIconModule
    ],
  templateUrl: './change-password-dialog.component.html',
  styleUrl: './change-password-dialog.component.scss'
})

export class ChangePasswordDialogComponent {
  passwordForm: FormGroup;
  hideCurrent = true;
  hideNew = true;
  hideConfirm = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private toastr: ToastrService,
    private router: Router,
    private auth: AuthService,
    private loader: CommonLoaderService
  ) {
    this.passwordForm = this.fb.group({
      // currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  OnChange() {
    if (this.passwordForm.valid) {
      this.loader.show();
      
      const payload = {
        email : this.auth.getUserEmail(),
        newPassword: this.passwordForm.get('newPassword')?.value,
        confirmPassword: this.passwordForm.get('confirmPassword')?.value
      };
      
      this.http.post('https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/change_password', payload).subscribe({
        next: (res: any) => {
          console.log('Password change success:', res);
          this.toastr.success('Password changed successfully');
          this.loader.hide();
          this.dialogRef.close({ success: true, data: this.passwordForm.value });
        },
        error: (err: any) => {
          if (err.status === 401) {
            this.toastr.warning('Unauthorized. Please try again.');
          } else if (err.status === 400) {
            this.toastr.warning('Invalid password format. Please check your input.');
          } else {
            console.error('Password change failed:', err);
            this.toastr.error('Failed to change password. Please try again.');
          }
          this.loader.hide();
        }
      });
    }
  }

  onSubmit(){
    
  }

  onCancel() {
    this.dialogRef.close();
  }
}
