/**
 * API Configuration for DocShield Lambda Functions
 * 
 * This file contains all the API endpoints used by the application.
 * Update these URLs when deploying to different environments.
 */

export const API_CONFIG = {
  // Base URL for your API Gateway
  BASE_URL: 'https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/file-operations',
  
  // Existing endpoints
  ENDPOINTS: {
    // Document list endpoint (existing)
    GET_DOCUMENT_LIST: '/get_document_list',
    
    // Document operations endpoint (updated to use file-operations)
    FILE_OPERATIONS: '/file-operations',
    
    // Legacy endpoints (if still needed)
    GET_PRESIGNED_URL: '/get_presigned_url',
    DELETE_DOCUMENT: '/delete_document'
  }
};

/**
 * Lambda Function Route Configuration
 * 
 * The file-operations endpoint handles all document operations:
 * 
 * API Gateway Routes:
 * - GET  /file-operations/{fileKey+}?action=view&userEmail={email}     -> View file metadata
 * - GET  /file-operations/{fileKey+}?action=download&userEmail={email} -> Download file content (base64)
 * - GET  /file-operations/{fileKey+}?action=presigned&userEmail={email}-> Get presigned URL
 * - DELETE /file-operations/{fileKey+}?userEmail={email}               -> Delete file
 * - OPTIONS /file-operations/{fileKey+}                                -> CORS preflight
 * 
 * Path Parameters:
 * - fileKey: The S3 object key (can contain slashes, hence {fileKey+})
 * 
 * Query Parameters:
 * - action: 'view' | 'download' | 'presigned' (for GET requests)
 * - userEmail: User's email for access control
 */