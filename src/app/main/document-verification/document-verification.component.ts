import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

interface DocumentItem {
  documentId: string;
  fileName: string;
  uploadedBy: string;
  status: string;
  fileUrl: string;
  uploadDate: string;
  fileSize: number;
  s3Key: string;
}

interface VerificationAction {
  action: 'verify';
  reason?: string;
}

@Component({
  selector: 'app-document-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './document-verification.component.html',
  styleUrl: './document-verification.component.scss'
})
export class DocumentVerificationComponent implements OnInit {
  documents: DocumentItem[] = [];
  selectedStatus = 'Pending Verification';
  statuses = ['Pending Verification', 'Verified'];
  isLoading = false;

  // API endpoints - Update these with your actual API Gateway URLs
  private readonly VERIFICATION_DOCS_ENDPOINT = 'https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/verification_documents';
  private readonly DOCUMENT_ACTIONS_ENDPOINT = 'https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/document_actions';

  constructor(
    private http: HttpClient, 
    private snackBar: MatSnackBar,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Double-check access (though the guard should have already handled this)
    if (!this.auth.isVerifier()) {
      this.snackBar.open('Access denied: Only verifiers can access this page', 'Close', { duration: 5000 });
      this.router.navigate(['/dashboard']);
      return;
    }
    this.fetchDocuments();
  }

  fetchDocuments(): void {
    this.isLoading = true;
    const userEmail = this.auth.getUserEmail();
    
    if (!userEmail) {
      this.snackBar.open('User not authenticated', 'Close', { duration: 3000 });
      this.router.navigate(['/login']);
      return;
    }

    const params = new URLSearchParams({
      status: this.selectedStatus,
      userEmail: userEmail
    });

    const apiUrl = `${this.VERIFICATION_DOCS_ENDPOINT}?${params.toString()}`;

    this.http.get<{documents: DocumentItem[], count: number, status_filter: string}>(apiUrl).subscribe({
      next: (response) => {
        this.documents = response.documents || [];
        this.isLoading = false;
        
        if (this.documents.length === 0) {
          this.snackBar.open(`No documents found with status: ${this.selectedStatus}`, 'Close', { duration: 2000 });
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching documents:', err);
        
        if (err.status === 403) {
          this.snackBar.open('Access denied: Verifier role required', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        } else if (err.status === 401) {
          this.snackBar.open('Authentication required', 'Close', { duration: 3000 });
          this.router.navigate(['/login']);
        } else {
          this.snackBar.open('Failed to load documents. Please try again.', 'Close', { duration: 3000 });
        }
      }
    });
  }

  viewDocument(doc: DocumentItem): void {
    if (doc.fileUrl && doc.fileUrl !== '#') {
      window.open(doc.fileUrl, '_blank');
    } else {
      this.snackBar.open('File URL not available', 'Close', { duration: 2000 });
    }
  }

  verifyDocument(doc: DocumentItem): void {
    this.performDocumentAction(doc, {
      action: 'verify',
      reason: 'Document approved by verifier'
    });
  }



  private performDocumentAction(doc: DocumentItem, actionData: VerificationAction): void {
    const userEmail = this.auth.getUserEmail();
    
    if (!userEmail) {
      this.snackBar.open('User not authenticated', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.snackBar.open(`Processing ${actionData.action}...`, '', { duration: 2000 });

    const requestBody = {
      fileName: doc.fileName,
      action: actionData.action,
      verifierEmail: userEmail,
      uploadedBy: doc.uploadedBy,
      reason: actionData.reason || ''
    };

    this.http.post<any>(this.DOCUMENT_ACTIONS_ENDPOINT, requestBody).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Update the document status locally
        const updatedStatus = this.getStatusFromAction(actionData.action);
        const docIndex = this.documents.findIndex(d => d.documentId === doc.documentId);
        if (docIndex !== -1) {
          this.documents[docIndex].status = updatedStatus;
        }

        this.snackBar.open(
          response.message || `Document ${actionData.action} completed successfully`, 
          'Close', 
          { duration: 3000 }
        );

        // Refresh the document list if the status filter no longer matches
        if (updatedStatus !== this.selectedStatus) {
          setTimeout(() => this.fetchDocuments(), 1000);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error(`Error performing ${actionData.action}:`, err);
        
        if (err.status === 403) {
          this.snackBar.open('Access denied: Insufficient permissions', 'Close', { duration: 3000 });
        } else if (err.status === 404) {
          this.snackBar.open('Document not found', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open(`Failed to ${actionData.action} document. Please try again.`, 'Close', { duration: 3000 });
        }
      }
    });
  }

  private getStatusFromAction(action: string): string {
    switch (action) {
      case 'verify':
        return 'Verified';
      default:
        return 'Pending Verification';
    }
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'verified';
      case 'pending verification':
        return 'pending';
      default:
        return 'pending';
    }
  }

  // Utility method to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Method to refresh documents
  refreshDocuments(): void {
    this.fetchDocuments();
  }

  // Track by function for ngFor performance
  trackByDocumentId(index: number, doc: DocumentItem): string {
    return doc.documentId;
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }
}