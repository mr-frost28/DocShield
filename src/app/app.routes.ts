import { Routes } from '@angular/router';
import { AuthGuard, VerifierGuard } from './services/auth.gaurds';
import { HomePageComponent } from './main/home-page/home-page.component';
import { SignupComponent } from './main/auth/signup/signup.component';
import { LoginComponent } from './main/auth/login/login.component';
import { DashboardComponent } from './main/dashboard/dashboard.component';
import { LearnMoreComponent } from './main/learn-more/learn-more.component';
import { UploadComponent } from './main/upload/upload.component';
import { MyDocumentsComponent } from './main/my-documents/my-documents.component';
import { ProfileComponent } from './main/profile/profile.component';
import { DocumentVerificationComponent } from './main/document-verification/document-verification.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    pathMatch: 'full'
  },
  {
    path: 'home-page',
    component: HomePageComponent
  },
  {
    path: 'signup',
    component: SignupComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  {
    path: 'learn-more', component: LearnMoreComponent
  },
  {
    path: 'upload', component: UploadComponent
  },
  {
    path: 'my-documents', component: MyDocumentsComponent, canActivate: [AuthGuard]
  },
  {
    path: 'profile', component: ProfileComponent, canActivate: [AuthGuard]
  },
  {
    path: 'documentVerification', component: DocumentVerificationComponent, canActivate: [AuthGuard]
  },

  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];