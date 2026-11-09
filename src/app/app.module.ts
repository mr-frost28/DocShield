import { NgModule } from '@angular/core';

import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';

// Import your components
import { HomePageComponent } from './main/home-page/home-page.component';
import { HeaderComponent } from './common/header/header.component';
import { FooterComponent } from './common/footer/footer.component';
import { RouterModule } from '@angular/router';
import { MainComponent } from './main/main.component';
import { SignupComponent } from './main/auth/signup/signup.component';
import { LoginComponent } from './main/auth/login/login.component';
import { LearnMoreComponent } from './main/learn-more/learn-more.component';
import { UploadComponent } from './main/upload/upload.component';
import { ProfileComponent } from './main/profile/profile.component';
import { ToastrModule } from 'ngx-toastr';


@NgModule({
  declarations: [
    MainComponent,
    HomePageComponent 
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule,
    AppComponent,
    HeaderComponent,
    FooterComponent,
    SignupComponent,
    LoginComponent,
    LearnMoreComponent,
    UploadComponent,
    ProfileComponent,
    ToastrModule.forRoot({
      closeButton: true,
      timeOut: 3000, // 3 seconds
      progressBar: true,
      positionClass: 'toast-top-right'
    }),
  ],
  providers: [],
  // Removed bootstrap array since AppComponent is bootstrapped in main.ts
})
export class AppModule {}
