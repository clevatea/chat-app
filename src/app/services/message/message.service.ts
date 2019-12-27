import { Injectable } from '@angular/core';
import { AngularFireDatabase, SnapshotAction } from '@angular/fire/database';
import { AuthenticateService } from '../../services/authenticate/authenticate.service';

import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import * as moment from 'moment/moment';

import { ListUser } from './../../model/model';
@Injectable({
  providedIn: 'root'
})
export class MessageService {
  public ListUsers: ListUser[] = [];
  private listUsersSubscription: Subscription;
  public listUserStable: boolean = false;
  constructor(private db: AngularFireDatabase, private authenticateService: AuthenticateService) {
    // listen to user status from service
    this.authenticateService.currentUser.subscribe(userData => {
      if (!userData) {
        // clean data when logout
        this.ListUsers = [];

        // unsubscribe listUser
        if (this.listUsersSubscription) {
          this.listUsersSubscription.unsubscribe();
        }
      } else {
        // get list user from database
        this.getListUsersUsingPromise();

        // listen to database list user
        this.listenListUser();
      }
    });
  }

  /**
   * @desc get list user data
   */
  async getListUsersUsingPromise() {
    const listUsers = await this.getListUsersFromDB();
    const currentUserValue = this.authenticateService.currentUserValue.username;

    const promise = listUsers
      .filter(item => item.key !== currentUserValue)
      .map(async userData => {
        // create room name
        const roomName = this.createRoomName(currentUserValue, userData.key);

        // search in rooms database if match with any data
        const roomDetail = await this.getRoomDetailFromDB(roomName);

        // create last message and unread counter
        let lastMessageData: object = null;
        let unreadCounter: number = null;
        if (roomDetail.length > 1) {
          const lastMessageProp: any = roomDetail[0].payload.val();

          // add `You : ` if current user is last person sending chat
          if (lastMessageProp) {
            if (lastMessageProp.name === currentUserValue) {
              lastMessageProp.message = 'You : ' + lastMessageProp.message;
            }
            lastMessageProp.time = moment(lastMessageProp.timestamp).format('MMM Do');
          }
          lastMessageData = lastMessageProp;
          unreadCounter = roomDetail[1].payload.val()[currentUserValue];
        }

        // return new  listUser prop
        return new ListUser(userData.key, roomName, lastMessageData, unreadCounter);
      });

    // wait for promise resolve then fill the ListUsers data
    Promise.all(promise).then(ListUsers => {
      // sort list user data
      this.listUserStable = true;
      this.ListUsers = ListUsers.sort((a, b) => {
        const lastMessageA: any = a.lastMessage;
        const lastMessageB: any = b.lastMessage;

        if (!lastMessageA) {
          return 1;
        } else {
          if (!lastMessageB) {
            return -1;
          } else {
            return lastMessageA.timestamp < lastMessageB.timestamp ? 1 : -1;
          }
        }
      });
    });
  }

  getMessageRoom(batch, lastKey) {
    return this.db.list('chats/messages/', ref =>
      lastKey
        ? ref
            .orderByChild('timestamp')
            .startAt(lastKey)
            .limitToFirst(batch)
        : ref.orderByChild('timestamp').limitToFirst(batch)
    );
  }

  /**
   * @desc get detail room
   * @param {string} room room name
   * @return will return promise
   */
  createNewRoom(username: string) {
    return new Promise(async (resolve, reject) => {
      const currentUser = this.authenticateService.currentUserValue.username;
      const roomName = this.createRoomName(currentUser, username);

      const roomPropery = {
        lastMessage: false,
        unread: {
          [currentUser]: 0,
          [username]: 0
        }
      };
      // create new Room in DB
      await this.db.list('chat/rooms').set(roomName, roomPropery);
      // create new Messages in DB
      await this.db.list('chat/messages').set(roomName, false);

      // resolve promise
      resolve();
    });
  }

  /**
   * @desc get detail room
   * @param {string} room room name
   * @return will return promise
   */
  getDetailRoom(room: string) {
    return this.db
      .list(`chat/rooms/${room}`)
      .snapshotChanges()
      .pipe(take(1))
      .toPromise();
  }
  /**
   * @desc get detail room
   * @param {string} room room name
   * @param {number} batch batch chat
   * @param {string} lastKey Last key chat
   * @return will return list message
   */
  getMessagesRoom(room: string, batch: number, lastKey: string) {
    return this.db.list('chat/messages/' + room, ref =>
      lastKey
        ? ref
            .orderByChild('timestamp')
            .startAt(lastKey)
            .limitToFirst(batch)
        : ref.orderByChild('timestamp').limitToFirst(batch)
    );
  }
  /**
   * @desc create unique name room
   * @param {string} user1 username 1
   * @param {string} user2 username 2
   * @return will return unique name room
   */
  createRoomName(user1: string, user2: string) {
    return [user1, user2].sort().join('-');
  }

  /**
   * @desc get data from table users
   * @return will return all users data from database
   */
  getListUsersFromDB() {
    return this.db
      .list(`users`)
      .snapshotChanges()
      .pipe(take(1))
      .toPromise();
  }

  /**
   * @desc get data from table room
   * @return will return data from selected room
   */
  getRoomDetailFromDB(room) {
    return this.db
      .list(`chat/rooms/${room}`)
      .snapshotChanges()
      .pipe(take(1))
      .toPromise();
  }

  /**
   * @desc Listen to all users firebase
   */
  listenListUser() {
    this.listUsersSubscription = this.db
      .list('users')
      .stateChanges(['child_added'])
      .subscribe(data => {
        if (this.listUserStable) {
          const roomName = this.createRoomName(this.authenticateService.currentUserValue.username, data.key);
          const listUser = new ListUser(data.key, roomName);
          this.ListUsers.push(listUser);
        }
      });
  }
}
