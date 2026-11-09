import { Amplify } from 'aws-amplify';

// AWS Cognito Configuration
// Replace these values with your actual Cognito User Pool details
export const cognitoConfig = {
  Auth: {
    // Region where your Cognito User Pool is located
    region: 'us-west-1', // Change to your preferred region
    
    // User Pool ID - you'll get this when you create your Cognito User Pool
    userPoolId: 'us-west-1_hTOJiWuMx', // Replace with your User Pool ID
    
    // User Pool Web Client ID - you'll get this when you create your app client
    userPoolWebClientId: '662cltv5eb7i87ui84pm6730ec', // Replace with your App Client ID
    
    // Optional: Custom domain for hosted UI (if using)
    // oauth: {
    //   domain: 'your-domain.auth.us-west-1.amazoncognito.com',
    //   scope: ['email', 'openid', 'profile'],
    //   redirectSignIn: 'http://localhost:4200/',
    //   redirectSignOut: 'http://localhost:4200/',
    //   responseType: 'code'
    // },
    
    // Password policy (these should match your Cognito settings)
    passwordFormat: {
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialCharacters: true
    },
    
    // MFA Configuration
    mfa: 'OPTIONAL', // Options: 'OFF', 'ON', 'OPTIONAL'
    mfaTypes: ['SMS', 'TOTP'], // Multi-factor options
    
    // Verification settings
    signUpVerificationMethod: 'email', // Use email for verification to save SMS costs
    
    // Custom attributes configuration
    customAttributes: [
      'custom:user_type', // Student, Verifier, etc.
      'custom:verification_status', // Verified, Pending, etc.
      'custom:institution', // University/Organization name
      'custom:document_count', // Number of documents uploaded
      'custom:last_verification_date' // When user was last verified
    ]
  }
};

// Environment-specific configurations
export const cognitoEnvironments = {
  development: {
    ...cognitoConfig,
    // Development-specific overrides
    Auth: {
      ...cognitoConfig.Auth,
      // You might want different settings for dev
    }
  },
  
  production: {
    ...cognitoConfig,
    Auth: {
      ...cognitoConfig.Auth,
      // Production-specific settings
      oauth: {
        // Production domain if using hosted UI
        domain: 'docshield.auth.us-west-1.amazoncognito.com',
        scope: ['email', 'openid', 'profile'],
        redirectSignIn: 'https://your-production-domain.com/',
        redirectSignOut: 'https://your-production-domain.com/',
        responseType: 'code'
      }
    }
  }
};

// // Initialize Amplify with appropriate configuration
// export function initializeAmplify(environment: 'development' | 'production' = 'development') {
//   const config = environment === 'production' 
//     ? cognitoEnvironments.production 
//     : cognitoEnvironments.development;
  
//   Amplify.configure(config);
  
//   console.log('AWS Amplify configured for:', environment);
//   console.log('User Pool ID:', config.Auth.userPoolId);
//   console.log('Region:', config.Auth.region);
// }

export function initializeAmplify() {
  try {
    const amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: 'us-west-1_hTOJiWuMx',
          userPoolClientId: '662cltv5eb7i87ui84pm6730ec'
        }
      }
    };
    
    Amplify.configure(amplifyConfig);

    console.log('✅ AWS Amplify configured successfully');
    console.log('🔗 User Pool ID: us-west-1_hTOJiWuMx');
    console.log('🔑 App Client ID: 662cltv5eb7i87ui84pm6730ec');
    console.log('🌍 Region: us-west-1 (extracted from User Pool ID)');
    
    // Verify configuration
    const currentConfig = Amplify.getConfig();
    console.log('📋 Current Amplify Config:', JSON.stringify(currentConfig, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to configure AWS Amplify:', error);
    return false;
  }
}

// User types for custom attributes
export enum UserType {
  STUDENT = 'Student',
  VERIFIER = 'Verifier',
  ADMIN = 'Admin'
}

export enum VerificationStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  REJECTED = 'Rejected',
  IN_REVIEW = 'In Review'
}

// Helper function to validate configuration
export function validateCognitoConfig(): boolean {
  const config = cognitoConfig.Auth;
  
  if (!config.userPoolId || config.userPoolId === 'us-west-1_XXXXXXXXX') {
    console.error('Please configure your actual Cognito User Pool ID');
    return false;
  }
  
  if (!config.userPoolWebClientId || config.userPoolWebClientId === 'xxxxxxxxxxxxxxxxxxxxxxxxxx') {
    console.error('Please configure your actual Cognito App Client ID');
    return false;
  }
  
  console.log('✅ Cognito configuration is valid');
  console.log('User Pool ID:', config.userPoolId);
  console.log('App Client ID:', config.userPoolWebClientId);
  
  return true;
}

// Instructions for setting up Cognito User Pool
export const cognitoSetupInstructions = `
COGNITO USER POOL SETUP INSTRUCTIONS:

1. Go to AWS Console > Cognito > User Pools
2. Create a new User Pool with these settings:
   
   STEP 1: Configure sign-in experience
   - Cognito user pool sign-in options: Email
   - User name requirements: Allow users to sign in with preferred username, Email
   
   STEP 2: Configure security requirements
   - Password policy: Choose based on your security needs
   - Multi-factor authentication: Optional (to save SMS costs)
   - User account recovery: Email only (to avoid SMS charges)
   
   STEP 3: Configure sign-up experience
   - Self-registration: Enable
   - Required attributes: Email, Given name, Family name
   - Custom attributes: Add the custom attributes listed in the config
   
   STEP 4: Configure message delivery
   - Email: Use Cognito (for free tier) or SES
   - SMS: Use Cognito (limited free SMS)
   
   STEP 5: Integrate your app
   - App type: Public client
   - App client name: DocShield-Client
   - Generate a client secret: No (for web applications)
   
3. After creation, copy:
   - User Pool ID to cognitoConfig.Auth.userPoolId
   - App Client ID to cognitoConfig.Auth.userPoolWebClientId
   
4. Optional: Set up custom email templates in Cognito console
5. Optional: Configure custom domains for hosted UI

ESTIMATED MONTHLY COSTS (Free Tier):
- User Pool: FREE for up to 50,000 MAUs
- Email verification: FREE (unlimited)
- SMS verification: FREE for first 100/month, then $0.00645 per SMS
- Lambda triggers: FREE for first 1M executions/month

RECOMMENDED FREE TIER OPTIMIZATION:
- Use email verification primarily
- Use SMS only for critical security events
- Implement progressive verification (start with email, add SMS for high-risk users)
`;