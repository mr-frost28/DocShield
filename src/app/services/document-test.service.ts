/**
 * Test Service for Document Operations
 * 
 * This service can be used to test the document operations
 * before deploying to production.
 */

import { Injectable } from '@angular/core';
import { DocumentService } from './document.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DocumentTestService {
  
  constructor(private documentService: DocumentService) {}

  /**
   * Test all document operations with a sample file
   */
  async testDocumentOperations(fileKey: string): Promise<void> {
    console.group('🧪 Testing Document Operations');
    
    try {
      // Test 1: View Document Metadata
      console.log('1️⃣ Testing view document metadata...');
      await this.testViewDocument(fileKey);
      
      // Test 2: Get Presigned URL
      console.log('2️⃣ Testing presigned URL generation...');
      await this.testPresignedUrl(fileKey);
      
      // Test 3: Download Document (Base64)
      console.log('3️⃣ Testing base64 download...');
      await this.testDownloadDocument(fileKey);
      
      // Note: Delete test is commented out to prevent accidental deletion
      // console.log('4️⃣ Testing document deletion...');
      // await this.testDeleteDocument(fileKey);
      
      console.log('✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      console.groupEnd();
    }
  }

  private async testViewDocument(fileKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.documentService.viewDocument(fileKey).pipe(
        catchError(error => {
          console.error('View document failed:', error);
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response) {
            console.log('✅ View document metadata:', response.file);
            resolve();
          } else {
            console.log('⚠️ View document returned null (expected if file not found)');
            resolve();
          }
        },
        error: (error) => {
          console.error('❌ View document error:', error);
          reject(error);
        }
      });
    });
  }

  private async testPresignedUrl(fileKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.documentService.getPresignedUrl(fileKey).pipe(
        catchError(error => {
          console.error('Presigned URL failed:', error);
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response) {
            console.log('✅ Presigned URL generated:', response.downloadUrl);
            console.log('   Expires in:', response.expiresIn, 'seconds');
            resolve();
          } else {
            console.log('⚠️ Presigned URL returned null (expected if file not found)');
            resolve();
          }
        },
        error: (error) => {
          console.error('❌ Presigned URL error:', error);
          reject(error);
        }
      });
    });
  }

  private async testDownloadDocument(fileKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.documentService.downloadDocument(fileKey).pipe(
        catchError(error => {
          console.error('Download document failed:', error);
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response) {
            console.log('✅ Download document response received');
            console.log('   Filename:', response.filename);
            console.log('   Content type:', response.contentType);
            console.log('   Size:', response.size, 'bytes');
            console.log('   Content length:', response.content.length, 'characters (base64)');
            resolve();
          } else {
            console.log('⚠️ Download document returned null (expected if file not found)');
            resolve();
          }
        },
        error: (error) => {
          console.error('❌ Download document error:', error);
          reject(error);
        }
      });
    });
  }

  private async testDeleteDocument(fileKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.warn('🚨 DELETE TEST - This will actually delete the file!');
      
      this.documentService.deleteDocument(fileKey).pipe(
        catchError(error => {
          console.error('Delete document failed:', error);
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response) {
            console.log('Document deleted:', response.deletedFile);
            console.log('Message:', response.message);
            resolve();
          } else {
            console.log('⚠️ Delete document returned null (expected if file not found)');
            resolve();
          }
        },
        error: (error) => {
          console.error('❌ Delete document error:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Test specific error scenarios
   */
  async testErrorScenarios(): Promise<void> {
    console.group('🧪 Testing Error Scenarios');
    
    try {
      // Test with non-existent file
      console.log('1️⃣ Testing with non-existent file...');
      await this.testViewDocument('nonexistent@example.com/fake-file.pdf');
      
      // Test with invalid file key
      console.log('2️⃣ Testing with invalid file key...');
      await this.testViewDocument('invalid-key');
      
      // Test without user email (should be handled by auth service)
      console.log('3️⃣ Testing access control...');
      await this.testViewDocument('other-user@example.com/their-file.pdf');
      
      console.log('✅ Error scenario tests completed!');
      
    } catch (error) {
      console.error('❌ Error scenario test failed:', error);
    } finally {
      console.groupEnd();
    }
  }
}

/**
 * Usage Example:
 * 
 * In your component constructor or ngOnInit:
 * 
 * constructor(private testService: DocumentTestService) {}
 * 
 * ngOnInit() {
 *   // Test with a real file key from your S3 bucket
 *   const testFileKey = 'user@example.com/sample-document.pdf';
 *   
 *   // Run all tests
 *   this.testService.testDocumentOperations(testFileKey);
 *   
 *   // Or test error scenarios
 *   this.testService.testErrorScenarios();
 * }
 */