import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthGuard } from '../../services/auth.gaurds';
import { AuthService } from '../../services/auth.service';
import { CommonService } from '../../services/common.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})

export class HomePageComponent {

  userIsLoggedIn = false;
  constructor( 
    public auth: AuthService, 
    private router: Router,
    private common: CommonService
  ) {}

  // ngOnInit(): void {
  //   this.userIsLoggedIn = this.auth.isLoggedIn(); // check status on load
  // }

  ngOnInit(): void {
    this.auth.userLoggedIn$.subscribe(status => {
      this.userIsLoggedIn = status;
    });
  }

  onGetStarted() {
    if (this.userIsLoggedIn) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  onLearnMore(){
    this.router.navigate(['/learn-more']);
  }
}
