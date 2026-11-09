import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { ToastrModule } from 'ngx-toastr';
import { initializeAmplify, validateCognitoConfig } from './app/config/cognito.config';

// Initialize AWS Amplify for Cognito
if (validateCognitoConfig()) {
  const initialized = initializeAmplify();
  if (initialized) {
    console.log('🚀 AWS Cognito initialized successfully');
  } else {
    console.error('❌ Failed to initialize AWS Cognito');
  }
} else {
  console.warn('⚠️ Cognito configuration is incomplete. Please check your configuration.');
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));


