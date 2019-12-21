import { Injectable } from '@angular/core';
import { take } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from './../../model/model';
@Injectable({
  providedIn: 'root'
})
export class AuthenticateService {
  private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;

  constructor(private db: AngularFireDatabase) {
    this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User {
    return this.currentUserSubject.value;
  }

  /**
   * @desc register process
   * @param {string} username username
   * @param {string} pass password
   * @return will return promise
   */
  async register(username: string, pass: string) {
    // data to keep in database
    const userData = { password: pass, notification: false };

    // get user data from database
    const isUserExist = (await this.checkExistedUser(username)).length ? true : false;

    // create promise
    return new Promise((resolve, reject) => {
      if (!isUserExist) {
        // add user to database
        const newUserPromise = this.db.list(`users`).update(username, userData);
        newUserPromise
          .then(_ => {
            // register success! and create session
            this.createSessionLogin(username);
            resolve();
          })
          .catch(err => {
            // throw error
            throw reject(err);
          });
      } else {
        // throw error
        throw reject('user already exist');
      }
    });
  }

  /**
   * @desc Login process
   * @param {string} username username
   * @param {string} password password
   * @return will return promise
   */
  async login(username: string, password: string) {
    // check user to db
    const user = await this.checkExistedUser(username);
    return new Promise((resolve, reject) => {
      // check if user exist
      if (user.length) {
        // get user password
        const userPassword = user[1].payload.val();
        // Check password
        if (userPassword === password) {
          this.createSessionLogin(username);
          resolve();
        } else {
          // throw error
          throw reject('wrong username or password');
        }
      } else {
        // throw error
        throw reject('wrong username or password');
      }
    });
  }

  createSessionLogin(username) {
    const user = new User(username);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * @desc store user data(username) to local storage and create session
   * @param {string} username password
   * @return desired data from database
   */
  async checkExistedUser(username: string) {
    return this.db
      .list(`users/${username}`)
      .snapshotChanges()
      .pipe(take(1))
      .toPromise();
  }

  /**
   * @desc Logout process
   */
  logout() {
    localStorage.removeItem('currentUser');

    // clear currentUserSubject data
    this.currentUserSubject.next(null);
  }
}
