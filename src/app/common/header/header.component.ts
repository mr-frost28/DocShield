import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common'; 
import { CommonService } from '../../services/common.service';
import { CommonLoaderService } from '../../services/common-loader.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, NgIf],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor( 
    public auth: AuthService, 
    private router: Router,
    private common: CommonService,
    private loader: CommonLoaderService,
    private toastr: ToastrService
  ) {}

  onLogout(): void {
    this.loader.show();
    this.auth.logout();
    setTimeout(() => {
      this.loader.hide();
      this.toastr.success('User Logged out Successfully!');
      this.router.navigate(['/home-page']);
    }, 1500); // Show loader for 1.5 seconds
  }
}
