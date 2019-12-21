import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { ModalDirective, ModalOptions } from 'ngx-bootstrap/modal';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';

import { AuthenticateService } from '../../../services/authenticate/authenticate.service';
@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements AfterViewInit {
  @ViewChild('authModal', { static: false }) authModal: ModalDirective;
  stateModal: string = 'login';
  configAuthModal: ModalOptions = {
    backdrop: 'static',
    keyboard: false
  };

  alert = '';

  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(private authenticateService: AuthenticateService, private formBuilder: FormBuilder) {
    // Create Login form
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    // Create Register form
    this.registerForm = this.formBuilder.group(
      {
        username: ['', Validators.required],
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required]
      },
      { validator: this.checkPasswords }
    );
  }

  ngAfterViewInit() {
    // listen to user authenticate status
    this.authenticateService.currentUser.subscribe(userData => {
      if (userData === null) {
        this.openModalHandler();
      } else if (userData) {
        this.closeModalHandler();
      }
    });
  }

  /**
   * @desc This is will check if password same with confirm password
   * @param {FormGroup} group The formgroup for validate
   * @return will return object or null
   */
  checkPasswords(group: FormGroup) {
    const pass = group.controls.password.value;
    const confirmPass = group.controls.confirmPassword.value;

    return pass === confirmPass ? null : { notSame: true };
  }

  /**
   * @desc Open modal and reset all form
   */
  openModalHandler() {
    // open modal
    this.authModal.show();
  }

  /**
   * @desc Hide modal
   */
  closeModalHandler() {
    this.authModal.hide();
  }

  changeToLoginForm() {
    // reset form
    this.loginForm.reset();

    this.stateModal = 'login';
  }

  changeToRegisterForm() {
    // reset form
    this.registerForm.reset();

    this.stateModal = 'register';
  }

  /**
   * @desc Login handler
   */
  onLoginHandler() {
    const username = this.loginForm.value.username;
    const password = this.loginForm.value.password;
    this.authenticateService
      .login(username, password)
      .then(_ => {
        // reset form
        this.loginForm.reset();
      })
      .catch(err => {
        this.alert = 'wrong username or password';
      });
  }

  /**
   * @desc Register handler
   */
  onRegisterHandler() {
    const username = this.registerForm.value.username;
    const password = this.registerForm.value.password;
    this.authenticateService
      .register(username, password)
      .then(_ => {
        // reset form
        this.registerForm.reset();
      })
      .catch(err => {
        this.alert = 'username has been taken';
      });
  }
}
