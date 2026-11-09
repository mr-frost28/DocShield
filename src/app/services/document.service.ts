import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface DocumentFile {
  key: string;
  filename: string;
  size: number;
  lastModified: string;
  contentType: string;
  metadata: any;
  etag: string;
}

export interface DocumentResponse {
  file: DocumentFile;
}

export interface DownloadResponse {
  filename: string;
  contentType: string;
  content: string; // base64 encoded
  size: number;
}

export interface PresignedUrlResponse {
  downloadUrl: string;
  filename: string;
  expiresIn: number;
}

export interface DeleteResponse {
  message: string;
  deletedFile: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  // Direct API endpoint for file operations
  private readonly API_BASE_URL = 'https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/file-operations';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get file metadata (view file information)
   */
  viewDocument(fileKey: string): Observable<DocumentResponse> {
    const userEmail = this.authService.getUserEmail();
    
    let params = new HttpParams()
      .set('action', 'view');
    
    if (userEmail) {
      params = params.set('userEmail', userEmail);
    }

    // Add headers that might be required by the API
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    return this.http.get<DocumentResponse>(`${this.API_BASE_URL}/${encodeURIComponent(fileKey)}`, {
      params,
      headers
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Download file content (returns base64 encoded content)
   */
  downloadDocument(fileKey: string): Observable<DownloadResponse> {
    const userEmail = this.authService.getUserEmail();
    
    let params = new HttpParams()
      .set('action', 'download');
    
    if (userEmail) {
      params = params.set('userEmail', userEmail);
    }

    // Add headers that might be required by the API
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    return this.http.get<DownloadResponse>(`${this.API_BASE_URL}/${encodeURIComponent(fileKey)}`, {
      params,
      headers
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get presigned URL for direct download (recommended approach)
   */
  getPresignedUrl(fileKey: string): Observable<PresignedUrlResponse> {
    const userEmail = this.authService.getUserEmail();
    
    let params = new HttpParams()
      .set('action', 'presigned');
    
    if (userEmail) {
      params = params.set('userEmail', userEmail);
    }

    // Add headers that might be required by the API
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    return this.http.get<PresignedUrlResponse>(`${this.API_BASE_URL}/${encodeURIComponent(fileKey)}`, {
      params,
      headers
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a document
   */
  deleteDocument(fileKey: string): Observable<DeleteResponse> {
    const userEmail = this.authService.getUserEmail();
    
    let params = new HttpParams();
    if (userEmail) {
      params = params.set('userEmail', userEmail);
    }

    // Add headers that might be required by the API
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    return this.http.delete<DeleteResponse>(`${this.API_BASE_URL}/${encodeURIComponent(fileKey)}`, {
      params,
      headers
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Helper method to download file using base64 content
   */
  downloadFileFromBase64(downloadResponse: DownloadResponse): void {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(downloadResponse.content);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: downloadResponse.contentType });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadResponse.filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Helper method to download file using presigned URL (recommended)
   */
  downloadFileFromUrl(presignedResponse: PresignedUrlResponse): void {
    const link = document.createElement('a');
    link.href = presignedResponse.downloadUrl;
    link.download = presignedResponse.filename;
    link.target = '_blank';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Helper method to view file using presigned URL
   */
  viewFileFromUrl(presignedResponse: PresignedUrlResponse): void {
    // For better viewing experience, we'll let the component handle this
    // to ensure proper content-type handling
    window.open(presignedResponse.downloadUrl, '_blank');
  }

  /**
   * Get file content as blob with proper content type
   */
  getFileAsBlob(fileKey: string): Observable<Blob> {
    const userEmail = this.authService.getUserEmail();
    
    let params = new HttpParams()
      .set('action', 'download');
    
    if (userEmail) {
      params = params.set('userEmail', userEmail);
    }

    return this.http.get(`${this.API_BASE_URL}/${encodeURIComponent(fileKey)}`, {
      params,
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        const blob = response.body;
        const contentType = response.headers.get('content-type');
        
        // If we have content-type info, create a new blob with proper type
        if (blob && contentType) {
          return new Blob([blob], { type: contentType });
        }
        
        return blob || new Blob();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Debug method to test API connectivity
   */
  testApiConnection(fileKey: string): void {
    const userEmail = this.authService.getUserEmail();
    const testUrl = `${this.API_BASE_URL}/${encodeURIComponent(fileKey)}?action=presigned&userEmail=${encodeURIComponent(userEmail || '')}`;
    
    console.log('=== API Debug Information ===');
    console.log('Base URL:', this.API_BASE_URL);
    console.log('File Key:', fileKey);
    console.log('Encoded File Key:', encodeURIComponent(fileKey));
    console.log('User Email:', userEmail);
    console.log('Full Test URL:', testUrl);
    console.log('URL Length:', testUrl.length);
    
    // Check if URL might be too long
    if (testUrl.length > 2048) {
      console.warn('URL might be too long for some browsers/servers');
    }
    
    console.log('=== End Debug Information ===');
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    // Enhanced error handling for debugging
    console.error('Full error object:', error);
    console.error('Error status:', error.status);
    console.error('Error URL:', error.url);
    console.error('Error headers:', error.headers);
    
    if (error.status === 403) {
      errorMessage = 'Access forbidden. Please check your permissions or API configuration.';
      console.error('403 Forbidden - Possible causes:');
      console.error('1. CORS configuration issue');
      console.error('2. API Gateway authentication/authorization');
      console.error('3. Lambda function permissions');
      console.error('4. Invalid userEmail or fileKey');
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      errorMessage = `HTTP ${error.status}: ${error.statusText || 'Unknown error'}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}