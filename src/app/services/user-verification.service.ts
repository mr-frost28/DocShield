import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface UserVerificationResult {
  isVerified: boolean;
  confidence: number;
  verifiedFields: string[];
  failedFields: string[];
  suggestions: string[];
  verificationMethods: VerificationMethod[];
}

export interface VerificationMethod {
  type: string;
  status: 'pending' | 'verified' | 'failed';
  verifiedAt?: Date;
  details?: any;
}

export interface IdentityVerificationResult {
  fullName: {
    isValid: boolean;
    confidence: number;
    suggestedCorrection?: string;
  };
  email: {
    isValid: boolean;
    isDeliverable: boolean;
    isDisposable: boolean;
    riskScore: number;
  };
  phone: {
    isValid: boolean;
    isReachable: boolean;
    country: string;
    carrier?: string;
    type: 'mobile' | 'landline' | 'voip' | 'unknown';
  };
  address?: {
    isValid: boolean;
    isDeliverable: boolean;
    geocoded: boolean;
    coordinates?: { lat: number; lng: number };
  };
}

export interface DocumentVerificationResult {
  documentType: string;
  extractedData: any;
  matchesUserData: boolean;
  confidence: number;
  discrepancies: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

@Injectable({
  providedIn: 'root'
})
export class UserVerificationService {
  private readonly VERIFICATION_API_BASE = 'https://your-verification-api.com';
  private readonly EMAIL_VERIFICATION_API = 'https://api.hunter.io/v2/email-verifier';
  private readonly PHONE_VERIFICATION_API = 'https://api.numverify.com/v1/validate';
  private readonly ADDRESS_VERIFICATION_API = 'https://api.smartystreets.com/street-address';

  // Common patterns for validation
  private readonly PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    name: /^[a-zA-Z\s\'\-\.]{2,50}$/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  };

  // Suspicious patterns to flag
  private readonly SUSPICIOUS_PATTERNS = {
    fakeNames: ['test', 'fake', 'dummy', 'sample', 'example', 'admin', 'root'],
    disposableEmailDomains: ['10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com'],
    commonPasswords: ['password', '123456', 'qwerty', 'admin', 'letmein']
  };

  constructor(private http: HttpClient) {}

  /**
   * Comprehensive user verification
   */
  verifyUser(userData: any): Observable<UserVerificationResult> {
    return new Observable(observer => {
      this.performUserVerification(userData).then(result => {
        observer.next(result);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Verify identity details against documents
   */
  verifyIdentityWithDocuments(userData: any, documents: File[]): Observable<DocumentVerificationResult[]> {
    const verificationPromises = documents.map(doc => 
      this.verifyDocumentAgainstUserData(doc, userData)
    );

    return new Observable(observer => {
      Promise.all(verificationPromises).then(results => {
        observer.next(results);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Verify email address
   */
  verifyEmail(email: string): Observable<{isValid: boolean, isDeliverable: boolean, riskScore: number}> {
    // Basic format validation
    if (!this.PATTERNS.email.test(email)) {
      return of({
        isValid: false,
        isDeliverable: false,
        riskScore: 1.0
      });
    }

    // Check against disposable email domains
    const domain = email.split('@')[1].toLowerCase();
    const isDisposable = this.SUSPICIOUS_PATTERNS.disposableEmailDomains.includes(domain);

    // In a real implementation, you would call an email verification service
    // For demo purposes, we'll do basic checks
    const mockResult = {
      isValid: true,
      isDeliverable: !isDisposable,
      riskScore: isDisposable ? 0.8 : 0.1
    };

    return of(mockResult);
  }

  /**
   * Verify phone number
   */
  verifyPhone(phone: string, countryCode?: string): Observable<{isValid: boolean, isReachable: boolean, country: string}> {
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    if (!this.PATTERNS.phone.test(cleanPhone)) {
      return of({
        isValid: false,
        isReachable: false,
        country: 'unknown'
      });
    }

    // Mock implementation - in real scenario, use services like Twilio, Numverify, etc.
    const mockResult = {
      isValid: cleanPhone.length >= 10,
      isReachable: true, // Would be determined by actual API
      country: countryCode || 'US'
    };

    return of(mockResult);
  }

  /**
   * Verify name against common suspicious patterns
   */
  verifyName(firstName: string, lastName: string): {isValid: boolean, confidence: number, issues: string[]} {
    const issues: string[] = [];
    let confidence = 1.0;

    // Check for suspicious patterns
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    
    for (const suspiciousName of this.SUSPICIOUS_PATTERNS.fakeNames) {
      if (fullName.includes(suspiciousName)) {
        issues.push(`Name contains suspicious pattern: ${suspiciousName}`);
        confidence -= 0.3;
      }
    }

    // Check name format
    if (!this.PATTERNS.name.test(firstName) || !this.PATTERNS.name.test(lastName)) {
      issues.push('Name contains invalid characters');
      confidence -= 0.2;
    }

    // Check length
    if (firstName.length < 2 || lastName.length < 2) {
      issues.push('Name too short');
      confidence -= 0.2;
    }

    // Check for repeated characters (like "aaaa" or "1111")
    if (/(.)\1{3,}/.test(fullName)) {
      issues.push('Name contains repeated character patterns');
      confidence -= 0.4;
    }

    return {
      isValid: issues.length === 0,
      confidence: Math.max(0, confidence),
      issues
    };
  }

  /**
   * Cross-reference user data with external databases (mock implementation)
   */
  crossReferenceUserData(userData: any): Observable<{matches: any[], confidence: number}> {
    // This would integrate with services like:
    // - Social media APIs (LinkedIn, Facebook)
    // - Professional directories
    // - Public records
    // - Identity verification services (Jumio, Onfido)

    return new Observable(observer => {
      // Mock implementation
      setTimeout(() => {
        const mockMatches = [
          {
            source: 'LinkedIn',
            confidence: 0.85,
            matchedFields: ['name', 'email', 'organization']
          },
          {
            source: 'University Records',
            confidence: 0.92,
            matchedFields: ['name', 'education']
          }
        ];

        observer.next({
          matches: mockMatches,
          confidence: 0.88
        });
        observer.complete();
      }, 2000);
    });
  }

  /**
   * Analyze user behavior patterns for authenticity
   */
  analyzeBehaviorPatterns(userActivity: any[]): {suspiciousActivity: string[], riskScore: number} {
    const suspicious: string[] = [];
    let riskScore = 0;

    // Check for suspicious timing patterns
    const timestamps = userActivity.map(a => new Date(a.timestamp));
    
    // Check for bot-like behavior (too fast interactions)
    for (let i = 1; i < timestamps.length; i++) {
      const timeDiff = timestamps[i].getTime() - timestamps[i-1].getTime();
      if (timeDiff < 100) { // Less than 100ms between actions
        suspicious.push('Unusually fast user interactions detected');
        riskScore += 0.2;
        break;
      }
    }

    // Check for unusual session patterns
    const sessionDurations = this.calculateSessionDurations(timestamps);
    const avgSessionDuration = sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length;
    
    if (avgSessionDuration < 30000) { // Less than 30 seconds average
      suspicious.push('Very short session durations');
      riskScore += 0.15;
    }

    // Check for consistent time zones (users typically have consistent patterns)
    const timeZoneChanges = this.detectTimeZoneInconsistencies(timestamps);
    if (timeZoneChanges > 3) {
      suspicious.push('Multiple timezone changes detected');
      riskScore += 0.25;
    }

    return {
      suspiciousActivity: suspicious,
      riskScore: Math.min(1.0, riskScore)
    };
  }

  /**
   * Perform comprehensive user verification
   */
  private async performUserVerification(userData: any): Promise<UserVerificationResult> {
    const verifiedFields: string[] = [];
    const failedFields: string[] = [];
    const suggestions: string[] = [];
    const verificationMethods: VerificationMethod[] = [];

    // Email verification
    try {
      const emailResult = await this.verifyEmail(userData.email).toPromise();
      if (emailResult?.isValid && emailResult.isDeliverable) {
        verifiedFields.push('email');
        verificationMethods.push({
          type: 'email',
          status: 'verified',
          verifiedAt: new Date(),
          details: emailResult
        });
      } else {
        failedFields.push('email');
        suggestions.push('Please provide a valid, non-disposable email address');
        verificationMethods.push({
          type: 'email',
          status: 'failed',
          details: emailResult
        });
      }
    } catch (error) {
      failedFields.push('email');
      suggestions.push('Email verification failed');
    }

    // Phone verification
    if (userData.phone) {
      try {
        const phoneResult = await this.verifyPhone(userData.phone).toPromise();
        if (phoneResult?.isValid && phoneResult.isReachable) {
          verifiedFields.push('phone');
          verificationMethods.push({
            type: 'phone',
            status: 'verified',
            verifiedAt: new Date(),
            details: phoneResult
          });
        } else {
          failedFields.push('phone');
          suggestions.push('Please provide a valid phone number');
        }
      } catch (error) {
        failedFields.push('phone');
        suggestions.push('Phone verification failed');
      }
    }

    // Name verification
    const nameResult = this.verifyName(userData.fname || '', userData.lname || '');
    if (nameResult.isValid) {
      verifiedFields.push('name');
      verificationMethods.push({
        type: 'name',
        status: 'verified',
        verifiedAt: new Date(),
        details: nameResult
      });
    } else {
      failedFields.push('name');
      suggestions.push(...nameResult.issues);
    }

    const confidence = verifiedFields.length / (verifiedFields.length + failedFields.length);

    return {
      isVerified: failedFields.length === 0,
      confidence,
      verifiedFields,
      failedFields,
      suggestions,
      verificationMethods
    };
  }

  /**
   * Verify document against user data
   */
  private async verifyDocumentAgainstUserData(document: File, userData: any): Promise<DocumentVerificationResult> {
    // This would use OCR and document analysis services
    // Mock implementation for demonstration
    
    const mockExtractedData = {
      name: `${userData.fname} ${userData.lname}`,
      email: userData.email,
      dateOfBirth: '1990-01-01',
      address: userData.address || 'Not provided'
    };

    const discrepancies: string[] = [];
    let matchesUserData = true;

    // Compare extracted data with user provided data
    if (mockExtractedData.name.toLowerCase() !== `${userData.fname} ${userData.lname}`.toLowerCase()) {
      discrepancies.push('Name mismatch between document and profile');
      matchesUserData = false;
    }

    return {
      documentType: this.getDocumentType(document.name),
      extractedData: mockExtractedData,
      matchesUserData,
      confidence: matchesUserData ? 0.95 : 0.3,
      discrepancies,
      verificationStatus: matchesUserData ? 'verified' : 'pending'
    };
  }

  /**
   * Get document type from filename
   */
  private getDocumentType(filename: string): string {
    const name = filename.toLowerCase();
    
    if (name.includes('aadhaar') || name.includes('aadhar')) return 'Aadhaar Card';
    if (name.includes('passport')) return 'Passport';
    if (name.includes('license') || name.includes('licence')) return 'Driving License';
    if (name.includes('pan')) return 'PAN Card';
    if (name.includes('voter')) return 'Voter ID';
    if (name.includes('resume') || name.includes('cv')) return 'Resume';
    if (name.includes('certificate')) return 'Certificate';
    if (name.includes('marksheet') || name.includes('transcript')) return 'Academic Record';
    
    return 'Unknown Document';
  }

  /**
   * Calculate session durations from timestamps
   */
  private calculateSessionDurations(timestamps: Date[]): number[] {
    const durations: number[] = [];
    let sessionStart = timestamps[0];
    
    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i].getTime() - timestamps[i-1].getTime();
      
      // If gap is more than 30 minutes, consider it a new session
      if (gap > 30 * 60 * 1000) {
        durations.push(timestamps[i-1].getTime() - sessionStart.getTime());
        sessionStart = timestamps[i];
      }
    }
    
    // Add the last session
    durations.push(timestamps[timestamps.length - 1].getTime() - sessionStart.getTime());
    
    return durations;
  }

  /**
   * Detect timezone inconsistencies
   */
  private detectTimeZoneInconsistencies(timestamps: Date[]): number {
    // Simple implementation - in reality, you'd analyze timezone patterns more thoroughly
    const timezoneOffsets = timestamps.map(t => t.getTimezoneOffset());
    const uniqueOffsets = [...new Set(timezoneOffsets)];
    
    return uniqueOffsets.length - 1; // Number of timezone changes
  }

  /**
   * Generate verification report
   */
  generateVerificationReport(userVerification: UserVerificationResult, documentVerifications: DocumentVerificationResult[]): any {
    const totalScore = (userVerification.confidence + 
      documentVerifications.reduce((sum, doc) => sum + doc.confidence, 0)) / 
      (1 + documentVerifications.length);

    return {
      overallScore: totalScore,
      riskLevel: totalScore > 0.8 ? 'Low' : totalScore > 0.5 ? 'Medium' : 'High',
      userVerification,
      documentVerifications,
      recommendations: this.generateRecommendations(userVerification, documentVerifications),
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }

  /**
   * Generate recommendations based on verification results
   */
  private generateRecommendations(userVerification: UserVerificationResult, documentVerifications: DocumentVerificationResult[]): string[] {
    const recommendations: string[] = [];

    if (userVerification.confidence < 0.7) {
      recommendations.push('Additional identity verification required');
    }

    const failedDocs = documentVerifications.filter(doc => doc.verificationStatus === 'rejected');
    if (failedDocs.length > 0) {
      recommendations.push('Some documents failed verification - manual review recommended');
    }

    if (userVerification.failedFields.includes('email')) {
      recommendations.push('Email verification required before full account activation');
    }

    if (userVerification.failedFields.includes('phone')) {
      recommendations.push('Phone verification recommended for enhanced security');
    }

    return recommendations;
  }

  private handleError(error: any): Observable<never> {
    console.error('User verification error:', error);
    return throwError(() => new Error('User verification failed'));
  }
}