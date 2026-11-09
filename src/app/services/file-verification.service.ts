import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface FileVerificationResult {
  isValid: boolean;
  fileType: string;
  actualMimeType: string;
  fileSize: number;
  hasValidSignature: boolean;
  securityScan: {
    isSafe: boolean;
    threats: string[];
  };
  metadata: {
    createdDate?: Date;
    modifiedDate?: Date;
    author?: string;
    application?: string;
  };
  documentAnalysis?: {
    textExtracted: string;
    confidence: number;
    detectedLanguage: string;
    documentType: string;
  };
}

export interface DocumentAuthenticityResult {
  isAuthentic: boolean;
  confidence: number;
  verificationMethods: string[];
  anomalies: string[];
  digitalSignatures?: {
    isPresent: boolean;
    isValid: boolean;
    issuer?: string;
    expiryDate?: Date;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FileVerificationService {
  private readonly VERIFICATION_API_URL = 'https://your-verification-api.com/verify';
  private readonly VIRUS_SCAN_API_URL = 'https://your-antivirus-api.com/scan';
  private readonly OCR_API_URL = 'https://your-ocr-api.com/extract';

  // File signatures (magic numbers) for common file types
  private readonly FILE_SIGNATURES: Record<string, string[]> = {
    'application/pdf': ['25504446', '255044462D'],
    'image/jpeg': ['FFD8FF'],
    'image/png': ['89504E47'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504B0304'],
    'application/msword': ['D0CF11E0'],
    'text/plain': [], // Text files can vary
    'image/gif': ['474946']
  };

  constructor(private http: HttpClient) {}

  /**
   * Comprehensive file verification
   */
  verifyFile(file: File): Observable<FileVerificationResult> {
    return new Observable(observer => {
      this.performFileVerification(file).then(result => {
        observer.next(result);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Verify document authenticity (for ID proofs, certificates, etc.)
   */
  verifyDocumentAuthenticity(file: File, documentType: string): Observable<DocumentAuthenticityResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    return this.http.post<DocumentAuthenticityResult>(
      `${this.VERIFICATION_API_URL}/authenticity`,
      formData
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Check if file type matches its content
   */
  private async performFileVerification(file: File): Promise<FileVerificationResult> {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // Get file signature (first few bytes)
    const signature = this.getFileSignature(uint8Array);
    const expectedSignatures = this.FILE_SIGNATURES[file.type] || [];
    
    const result: FileVerificationResult = {
      isValid: true,
      fileType: file.type,
      actualMimeType: file.type,
      fileSize: file.size,
      hasValidSignature: this.validateFileSignature(signature, expectedSignatures),
      securityScan: {
        isSafe: true,
        threats: []
      },
      metadata: {
        createdDate: new Date(file.lastModified),
        modifiedDate: new Date(file.lastModified)
      }
    };

    // Perform additional checks based on file type
    if (file.type.startsWith('image/')) {
      await this.verifyImageFile(uint8Array, result);
    } else if (file.type === 'application/pdf') {
      await this.verifyPdfFile(uint8Array, result);
    }

    // Security scan (you would implement this with a real antivirus API)
    result.securityScan = await this.performSecurityScan(file);

    // OCR and document analysis for text extraction
    if (this.isDocumentType(file.type)) {
      result.documentAnalysis = await this.performOCR(file);
    }

    return result;
  }

  /**
   * Get file signature from first few bytes
   */
  private getFileSignature(uint8Array: Uint8Array): string {
    return Array.from(uint8Array.slice(0, 8))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  /**
   * Validate file signature against expected signatures
   */
  private validateFileSignature(signature: string, expectedSignatures: string[]): boolean {
    if (expectedSignatures.length === 0) return true; // No signature check for some file types
    
    return expectedSignatures.some(expected => 
      signature.startsWith(expected.toUpperCase())
    );
  }

  /**
   * Verify image file integrity
   */
  private async verifyImageFile(uint8Array: Uint8Array, result: FileVerificationResult): Promise<void> {
    try {
      // Create blob and try to load as image
      const arrayBuffer = new ArrayBuffer(uint8Array.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(uint8Array);
      const blob = new Blob([arrayBuffer]);
      const imageUrl = URL.createObjectURL(blob);
      
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      
      URL.revokeObjectURL(imageUrl);
      
      // Check for basic image properties
      if (img.width === 0 || img.height === 0) {
        result.isValid = false;
      }
      
      // Check for metadata manipulation (basic check)
      await this.checkImageMetadata(uint8Array, result);
      
    } catch (error) {
      result.isValid = false;
    }
  }

  /**
   * Verify PDF file structure
   */
  private async verifyPdfFile(uint8Array: Uint8Array, result: FileVerificationResult): Promise<void> {
    const pdfHeader = new TextDecoder().decode(uint8Array.slice(0, 8));
    
    if (!pdfHeader.startsWith('%PDF-')) {
      result.isValid = false;
      return;
    }

    // Check for PDF trailer
    const pdfContent = new TextDecoder().decode(uint8Array);
    if (!pdfContent.includes('%%EOF')) {
      result.isValid = false;
    }

    // Check for suspicious JavaScript or form actions
    const suspiciousPatterns = [
      '/JavaScript',
      '/JS',
      '/OpenAction',
      'this.print',
      'app.launchURL'
    ];

    for (const pattern of suspiciousPatterns) {
      if (pdfContent.includes(pattern)) {
        result.securityScan.threats.push(`Suspicious PDF content: ${pattern}`);
        result.securityScan.isSafe = false;
      }
    }
  }

  /**
   * Check image metadata for manipulation signs
   */
  private async checkImageMetadata(uint8Array: Uint8Array, result: FileVerificationResult): Promise<void> {
    // This is a simplified version - you would use a proper EXIF library
    try {
      const dataView = new DataView(uint8Array.buffer);
      
      // Look for EXIF data in JPEG files
      if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
        // Search for EXIF marker (0xFFE1)
        for (let i = 2; i < uint8Array.length - 1; i++) {
          if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xE1) {
            // Found EXIF data - you can extract creation date, camera info, etc.
            result.metadata.application = "Camera/Image Editor";
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Could not read image metadata:', error);
    }
  }

  /**
   * Perform security scan (mock implementation)
   */
  private async performSecurityScan(file: File): Promise<{isSafe: boolean, threats: string[]}> {
    // In a real implementation, you would send the file to an antivirus API
    // This is a mock that performs basic checks
    
    const threats: string[] = [];
    
    // Check file size (suspiciously large files)
    if (file.size > 100 * 1024 * 1024) { // 100MB
      threats.push('File size exceeds safe limits');
    }
    
    // Check file name for suspicious patterns
    const suspiciousPatterns = [
      '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js',
      'javascript:', 'data:', 'vbscript:'
    ];
    
    const fileName = file.name.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (fileName.includes(pattern)) {
        threats.push(`Suspicious file name pattern: ${pattern}`);
      }
    }
    
    return {
      isSafe: threats.length === 0,
      threats
    };
  }

  /**
   * Perform OCR and document analysis
   */
  private async performOCR(file: File): Promise<any> {
    // Mock implementation - you would integrate with OCR services like:
    // - Google Cloud Vision API
    // - AWS Textract
    // - Azure Computer Vision
    
    return {
      textExtracted: "Sample extracted text...",
      confidence: 0.95,
      detectedLanguage: "en",
      documentType: "identity_document"
    };
  }

  /**
   * Check if file type is a document that can be analyzed
   */
  private isDocumentType(mimeType: string): boolean {
    const documentTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    return documentTypes.includes(mimeType) || mimeType.startsWith('image/');
  }

  /**
   * Validate file against business rules
   */
  validateDocumentRules(file: File, documentType: string): {isValid: boolean, errors: string[]} {
    const errors: string[] = [];
    
    // Size limits based on document type
    const sizeLimits = {
      'Resume': 10 * 1024 * 1024, // 10MB
      'ID Proof': 5 * 1024 * 1024, // 5MB
      'Certificate': 10 * 1024 * 1024, // 10MB
      'Marksheet': 10 * 1024 * 1024, // 10MB
      'Others': 25 * 1024 * 1024 // 25MB
    };
    
    const maxSize = sizeLimits[documentType as keyof typeof sizeLimits] || 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit for ${documentType}`);
    }
    
    // File type restrictions
    const allowedTypes = {
      'Resume': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'ID Proof': ['application/pdf', 'image/jpeg', 'image/png'],
      'Certificate': ['application/pdf', 'image/jpeg', 'image/png'],
      'Marksheet': ['application/pdf', 'image/jpeg', 'image/png'],
      'Others': ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    const allowedForType = allowedTypes[documentType as keyof typeof allowedTypes] || [];
    
    if (allowedForType.length > 0 && !allowedForType.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed for ${documentType}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('File verification error:', error);
    return throwError(() => new Error('File verification failed'));
  }
}