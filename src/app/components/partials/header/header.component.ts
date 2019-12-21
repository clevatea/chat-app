import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticateService } from '../../../services/authenticate/authenticate.service';
import { User } from './../../../model/model';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  currentUser: User;
  constructor(private router: Router, private authenticateService: AuthenticateService) {
    // listen to user status from service
    this.authenticateService.currentUser.subscribe(userData => {
      this.currentUser = userData;
    });
  }
  /**
   * @desc Logout
   */
  logoutHandler() {
    this.authenticateService.logout();
    this.router.navigate(['/']);
  }
  ngOnInit() {}
}
