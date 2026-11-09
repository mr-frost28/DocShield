import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';
import { DatePipe, JsonPipe } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { CommonLoaderService } from '../../services/common-loader.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { DocumentService, DocumentFile } from '../../services/document.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface Document {
  title: string;
  type: string;
  uploadDate: string;
  key: string; // S3 object key
  size?: number;
  contentType?: string;
  status?: string;
}

@Component({
  selector: 'app-my-documents',
  standalone: true,
  imports: [NgIf, DatePipe, JsonPipe, NgFor, CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './my-documents.component.html',
  styleUrls: ['./my-documents.component.scss']
})
export class MyDocumentsComponent implements OnInit {
  documents: Document[] = [];
  loading = false;
  message = '';
  showFileInfoModal = false;
  selectedFileInfo: DocumentFile | null = null;
  Object = Object; // Make Object available in template

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private loader: CommonLoaderService,
    private toastr: ToastrService,
    private documentService: DocumentService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.fetchDocuments();
  }

  fetchDocuments() {
    this.loading = true;
    this.loader.show();
    const userEmail = this.auth.getUserEmail();
    if (!userEmail) {
      this.toastr.warning('User email not found');
      this.loader.hide();
      this.loading = false;
      return;
    }
    this.http.get<any>(`https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/get_document_list?userEmail=${userEmail}`).subscribe({
      next: (res) => {
        this.documents = res.documents || [];
        this.loading = false;
        this.loader.hide();
      },
      error: () => {
        this.message = 'Failed to load documents';
        this.toastr.error('Failed to load documents');
        this.loading = false;
        this.loader.hide();
      }
    });
  }

  viewDoc(doc: Document): void {
    this.loader.show();
    const apiUrl = 'https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/file-operations';

    const payload = {
      docId: doc.title,
      userEmail: this.auth.getUserEmail(),
      operation: 'presigned_url',
      action: 'view'
    };

    this.http.post(apiUrl, payload).subscribe({
      next: (response: any) => {
        this.loader.hide();
        if (response.downloadUrl) {
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.location.href = response.downloadUrl;
          } else {
            window.location.href = response.downloadUrl;
          }
        } else {
          console.error('No download URL received');
          this.toastr.error('No download URL received');
        }
      },
      error: (err) => {
        this.loader.hide();
        console.error('Error fetching document:', err);
        this.toastr.error('Error viewing document');
      }
    });
  }

  downloadDoc(doc: Document): void {
    const apiUrl = 'https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/file-operations';

    const payload = {
      docId: doc.title,
      userEmail: this.auth.getUserEmail(),
      operation: 'presigned_url',
      action: 'download'  // This will force download
    };

    this.http.post(apiUrl, payload).subscribe({
      next: (response: any) => {
        if (response.downloadUrl) {
          // Create a temporary link to trigger download
          const link = document.createElement('a');
          link.href = response.downloadUrl;
          link.download = doc.title;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      },
      error: (err) => {
        console.error('Error downloading document:', err);
      }
    });
  }

  deleteDoc(doc: Document): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      maxWidth: '90vw',
      disableClose: true,
      panelClass: 'custom-dialog-container',
      data: { title: doc.title }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) {
        return;
      }
      this.loader.show();
      this.message = '';

      const apiUrl = 'https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/file-operations';

      const payload = {
        docId: doc.title,
        userEmail: this.auth.getUserEmail(),
        operation: 'delete'
      };

      this.http.post(apiUrl, payload).subscribe({
        next: (response: any) => {
          this.toastr.success(response.message || 'Document deleted successfully');
          this.message = 'Document deleted successfully';

          // Remove document from local array
          this.documents = this.documents.filter(d => d.key !== doc.key);

          this.loader.hide();
        },
        error: (error) => {
          console.error('Error deleting document:', error);
          this.toastr.error(`Delete failed: ${error.error?.message || error.message || 'Unknown error'}`);
          this.message = 'Failed to delete document';
          this.loader.hide();
        }
      });
    });
  }

  displayFileInfo(file: DocumentFile): void {
    this.selectedFileInfo = file;
    this.showFileInfoModal = true;
  }

  closeFileInfoModal(): void {
    this.showFileInfoModal = false;
    this.selectedFileInfo = null;
  }
}
