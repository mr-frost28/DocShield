import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { CommonLoaderService } from '../../services/common-loader.service';
import { AuthService } from '../../services/auth.service';
import { FileVerificationService, FileVerificationResult } from '../../services/file-verification.service';
import { UserVerificationService } from '../../services/user-verification.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, CommonModule, HttpClientModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})

export class UploadComponent {
  uploadForm: FormGroup;
  documentTypes: string[] = ['Resume', 'Marksheet', 'Certificate', 'ID Proof', 'Others'];
  selectedFile: File | null = null;
  isUploading = false;
  isVerifying = false;
  message = '';
  success = false;
  verificationResult: FileVerificationResult | null = null;
  verificationErrors: string[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private loader: CommonLoaderService,
    private toastr: ToastrService,
    private authService: AuthService,
    private fileVerificationService: FileVerificationService,
    private userVerificationService: UserVerificationService) {

    this.uploadForm = this.fb.group({
      title: ['', Validators.required],
      type: ['', Validators.required],
    });
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    this.verificationResult = null;
    this.verificationErrors = [];
    
    if (this.selectedFile) {
      this.verifyFile();
    }
  }

  verifyFile() {
    if (!this.selectedFile) return;

    this.isVerifying = true;
    this.loader.show();

    // First, validate against business rules
    const documentType = this.uploadForm.get('type')?.value || 'Others';
    const businessRuleValidation = this.fileVerificationService.validateDocumentRules(
      this.selectedFile,
      documentType
    );

    if (!businessRuleValidation.isValid) {
      this.verificationErrors = businessRuleValidation.errors;
      this.isVerifying = false;
      this.loader.hide();
      this.toastr.error('File validation failed');
      return;
    }

    // Perform comprehensive file verification
    this.fileVerificationService.verifyFile(this.selectedFile).subscribe({
      next: (result) => {
        this.verificationResult = result;
        this.isVerifying = false;
        this.loader.hide();

        if (result.isValid && result.securityScan.isSafe) {
          this.toastr.success('File verification passed');
        } else {
          this.verificationErrors = [
            ...(result.isValid ? [] : ['File integrity check failed']),
            ...result.securityScan.threats
          ];
          this.toastr.warning('File verification completed with warnings');
        }
      },
      error: (error) => {
        console.error('File verification failed:', error);
        this.verificationErrors = ['File verification failed'];
        this.isVerifying = false;
        this.loader.hide();
        this.toastr.error('File verification failed');
      }
    });
  }

  onUpload() {
    if (!this.uploadForm.valid || !this.selectedFile) {
      this.toastr.error('Please fill all required fields and select a file');
      return;
    }

    // Check if file verification passed
    if (!this.verificationResult || !this.verificationResult.isValid || !this.verificationResult.securityScan.isSafe) {
      this.toastr.error('Cannot upload file that failed verification');
      return;
    }

    // Check for verification errors
    if (this.verificationErrors.length > 0) {
      this.toastr.error('Please resolve file verification issues before uploading');
      return;
    }

    this.isUploading = true;
    this.loader.show();
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64File = (reader.result as string).split(',')[1];
      
      // Enhanced payload with verification data
      const payload = {
        title: this.uploadForm.value.title,
        type: this.uploadForm.value.type,
        filename: this.selectedFile?.name,
        file: base64File,
        userEmail: this.authService.getUserEmail(),
        verification: {
          fileVerification: this.verificationResult,
          verifiedAt: new Date(),
          verificationId: this.generateVerificationId()
        }
      };

      this.http.post('https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/upload', payload).subscribe({
        next: (res: any) => {
          this.success = true;
          this.toastr.success('Document uploaded and verified successfully!');
          this.resetForm();
        },
        error: (err) => {
          console.error('Upload error:', err);
          this.success = false;
          this.toastr.error('Upload failed. Please try again.');
          this.isUploading = false;
          this.loader.hide();
        }
      });
    };
    
    reader.readAsDataURL(this.selectedFile);
  }

  resetForm() {
    this.uploadForm.reset();
    this.selectedFile = null;
    this.verificationResult = null;
    this.verificationErrors = [];
    this.isUploading = false;
    this.loader.hide();
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  private generateVerificationId(): string {
    return 'verify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Helper methods for template
  get isFileValid(): boolean {
    return this.verificationResult?.isValid && this.verificationResult.securityScan.isSafe || false;
  }

  get canUpload(): boolean {
    return this.uploadForm.valid && 
           this.selectedFile !== null && 
           this.isFileValid && 
           this.verificationErrors.length === 0 &&
           !this.isUploading &&
           !this.isVerifying;
  }
}
