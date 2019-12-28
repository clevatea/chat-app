import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';

import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { SnapshotAction, AngularFireDatabase } from '@angular/fire/database';

import { AuthenticateService } from '../../services/authenticate/authenticate.service';
import { MessageService } from '../../services/message/message.service';
import * as moment from 'moment/moment';
import { Message } from '../../model/model';
import { SanitizePipe } from './../../pipes/chat.pipe';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss']
})
export class MessageComponent implements OnInit, OnDestroy {
  formChat: FormGroup;
  activeRoom: string;
  loadingActiveRoom: boolean = false;

  batch = 22; // size of each query message
  lastKey = ''; // key message to offset next query from
  finished = false; // boolean when end of database mesasge is reached
  dataChats: any[] = [];

  roomStable: boolean = false;
  activeRoomSubscription: Subscription;
  notificationSubscription: Subscription;

  constructor(
    private authenticateService: AuthenticateService,
    private messageService: MessageService,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private sanitizePipe: SanitizePipe,
    private db: AngularFireDatabase
  ) {
    // make form chat
    this.formChat = this.formBuilder.group({
      message: ['', [Validators.required, this.trimMessage]]
    });

    // listen to actived route
    this.activatedRoute.params.subscribe((params: Params) => {
      if (params.room) {
        // clear data
        this.clearActiveRoom();

        // set active room
        this.seTactiveRoom(params.room);
      }
    });

    // listen to user status from service
    this.authenticateService.currentUser.subscribe(userData => {
      if (userData) {
        // listen to current user
        this.listenMe();
      } else {
        // clear data when logout
        this.clearActiveRoom();
      }
    });
  }
  ngOnInit() {}

  /**
   * @desc Send Message Handler
   */
  sendMessage() {
    // escape message
    const message = this.sanitizePipe.transform(
      this.formChat.value.message.replace(/^\s+|\s+$/g, '').replace(/\r\n|\r|\n/g, '<br />')
    );

    // Push to this.dataChat
    this.addToDataChatsHandler(message);

    // Send message firebase
    const data = {
      name: this.authenticateService.currentUserValue.username,
      message,
      timestamp: { '.sv': 'timestamp' }
    };
    const storeMessage = this.db.list('chat/messages/' + this.activeRoom).push(data);
    const key = storeMessage.key;

    storeMessage.then(_ => {
      // make timestamp negative for sorting message
      this.db
        .object(`chat/messages/${this.activeRoom}/${key}`)
        .valueChanges()
        .pipe(take(1))
        .subscribe(async (dataMessage: any) => {
          // timestamp negative
          const timestamp = dataMessage.timestamp * -1;
          this.db.list('chat/messages/' + this.activeRoom).update(key, { timestamp });

          // change notification to emit other user
          const notificationData = { ...data, timestamp: dataMessage.timestamp, roomName: this.activeRoom };
          const getUserName: string = this.activeRoom
            .split('-')
            .filter(e => e !== this.authenticateService.currentUserValue.username)[0];
          this.db.list(`users/${getUserName}`).update('notification', notificationData);

          // change notification for current User
          this.db
            .list(`users/${this.authenticateService.currentUserValue.username}`)
            .update('notification', notificationData);

          // update rooms in firebase
          const lastMessage = data;
          const getUnread = await this.messageService.getRoomDetailFromDB(this.activeRoom);
          const unread = getUnread[1].payload.val()[getUserName];
          const dataRooms = {
            lastMessage,
            unread: {
              [getUserName]: unread + 1,
              [this.authenticateService.currentUserValue.username]: 0
            }
          };
          this.db.list(`chat/rooms`).update(this.activeRoom, dataRooms);
        });
    });
    this.formChat.reset();
  }

  /**
   * @desc Handler for add new chat data
   * @param {string} message given message
   * @param {string} name?
   */
  addToDataChatsHandler(message: string, name?: string) {
    // make new chat
    const chat = new Message(
      name ? name : this.authenticateService.currentUserValue.username,
      message,
      moment(Date.now()).format('LT'),
      Date.now()
    );

    // add new date if get diff date between chat
    const lastDataChat = this.dataChats.slice(-1)[0];
    const lastDataTime = !lastDataChat ? Date.now() : lastDataChat.timestamp;
    const dateNow = new Date();

    // get day diff chat before and now
    const dayDiff = this.getDiffBetweenDate(lastDataTime, dateNow, 'days');
    if (dayDiff > 0 || !lastDataChat) {
      // make diff date
      const nameDay = moment(lastDataTime).format('ll');
      const chatDateOnly = { date: nameDay };
      this.dataChats.push(chatDateOnly);
    }
    // push to dataChats
    this.dataChats.push(chat);
  }

  /**
   * @desc Scroll chat container handler
   */
  scrollHandler(e) {
    if (e === 'top') {
      if (this.finished) {
        return false;
      } else {
        this.getMessage(true);
      }
    }
  }

  /**
   * @desc will clear active room data
   */
  clearActiveRoom() {
    // clear data
    this.dataChats = [];
    this.activeRoom = undefined;
    // unsubscribe active room
    if (this.activeRoomSubscription) {
      this.activeRoomSubscription.unsubscribe();
    }
  }

  /**
   * @desc this will set active room
   * @param {string} room
   */
  async seTactiveRoom(roomName: string) {
    this.lastKey = '';
    this.finished = false;
    this.roomStable = false;
    this.activeRoom = roomName;
    this.loadingActiveRoom = true;
    const detailRoom = await this.messageService.getDetailRoom(roomName);

    // check if room already subscribed
    if (this.activeRoomSubscription) {
      // remove subscription
      this.activeRoomSubscription.unsubscribe();
    }

    // if room exist
    if (detailRoom.length) {
      this.loadingActiveRoom = false;

      // get message data
      this.getMessage();

      // listen to room
      this.listenActiveRoom();

      // read room
      this.readRoom();
    } else {
      const username = roomName.split('-').filter(e => e !== this.authenticateService.currentUserValue.username)[0];

      // make sure user is registered
      const userExist = await this.authenticateService.checkExistedUser(username);
      if (userExist) {
        // make new room
        this.messageService.createNewRoom(username).then(c => {
          this.loadingActiveRoom = false;
          this.dataChats = [];
        });
      }
    }
  }

  /**
   * @desc listen active room in firebase
   */
  listenActiveRoom() {
    this.activeRoomSubscription = this.db
      .list(`chat/messages/${this.activeRoom}`)
      .stateChanges(['child_added'])
      .subscribe((datas: SnapshotAction<any>) => {
        if (this.roomStable) {
          const data = datas.payload.val();
          if (data.name !== this.authenticateService.currentUserValue.username) {
            this.addToDataChatsHandler(data.message, data.name);
          }
        }
      });
  }

  /**
   * @desc Listen to current User
   */
  listenMe() {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    this.notificationSubscription = this.db
      .list(`users/${this.authenticateService.currentUserValue.username}`)
      .stateChanges(['child_changed'])
      .subscribe((data: SnapshotAction<unknown>) => {
        if (this.messageService.listUserStable) {
          const notification: any = data.payload.val();
          let isCurrentUserSentIt = false;
          // create room name
          const roomName = notification.roomName;
          // FIND other username in List User
          let indexList = this.messageService.ListUsers.findIndex(({ name }) => name === notification.name);
          // if user cannot be found , it might be the current user that sent it self
          if (indexList === -1) {
            // find other user
            const username = roomName
              .split('-')
              .filter(e => e !== this.authenticateService.currentUserValue.username)[0];
            indexList = this.messageService.ListUsers.findIndex(({ name }) => name === username);

            // add 'You :' to message
            if (indexList !== -1) {
              notification.message = 'You : ' + notification.message;
              isCurrentUserSentIt = true;
            }
          }
          const changedList = this.messageService.ListUsers[indexList];
          if (changedList) {
            // change listUser properties
            const lastMessage = {
              message: notification.message,
              name: notification.name,
              timestamp: notification.timestamp,
              time: moment(notification.timestamp).format('MMM Do')
            };
            changedList.lastMessage = lastMessage;
            // if not current user send message
            if (!isCurrentUserSentIt) {
              changedList.unread =
                this.activeRoom !== roomName ? (changedList.unread === undefined ? 1 : changedList.unread + 1) : 0;
              // if room inactive will move to top
              if (this.activeRoom !== roomName) {
                this.messageService.ListUsers = this.arraymove(this.messageService.ListUsers, indexList, 0);
              }
            }
          }
        }
      });
  }

  // need to destroy notificationsubscription for different route
  ngOnDestroy() {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }
  /**
   * @desc get message
   */
  readRoom() {
    const checkExist = setInterval(() => {
      if (this.messageService.listUserStable) {
        const indexList = this.messageService.ListUsers.findIndex(({ nameRoom }) => nameRoom === this.activeRoom);
        this.messageService.ListUsers[indexList].unread = 0;

        // update unread database
        this.db
          .list(`chat/rooms/${this.activeRoom}`)
          .update('unread', { [this.authenticateService.currentUserValue.username]: 0 });
        clearInterval(checkExist);
      }
    }, 100);
  }

  /**
   * @desc get message
   */
  getMessage(loadMore?: boolean) {
    this.messageService
      .getMessagesRoom(this.activeRoom, this.batch + 1, this.lastKey)
      .snapshotChanges()
      .pipe(take(1))
      .subscribe((data: SnapshotAction<any>[]) => {
        if (data.length > 0) {
          const lastData = data.slice(-1)[0].payload.val();
          this.lastKey = lastData.timestamp;
          const newData = data.slice(0, this.batch);
          const newDataLastkey = (newData.slice(-1)[0].payload.val() as any).timestamp;

          // If data is identical, stop making queries
          if (this.lastKey === newDataLastkey) {
            this.finished = true;
          }

          if (loadMore) {
            // if Load More
            this.dataChats.unshift(...this.makeChats(newData));
          } else {
            this.dataChats = this.makeChats(newData);
          }
          this.roomStable = true;
        }
      });
  }

  /**
   * @desc convert raw data from firebase to formatted chat data
   * @param {SnapshotAction} dataChats
   * @return will return sorted and formatted chat data
   */
  makeChats(dataChats: SnapshotAction<any>[]) {
    const chats: any[] = [];
    // reverse chats
    dataChats.reverse();
    dataChats.map((dataChat: SnapshotAction<any>, index) => {
      const chatValue = dataChat.payload.val();

      // abs chat timestamp
      const timestamp = Math.abs(chatValue.timestamp);
      const time = moment(Math.abs(chatValue.timestamp)).format('LT');
      const chat = new Message(chatValue.name, chatValue.message, time, timestamp);

      let date1: number;
      let date2: number;
      let dayDiff: number;

      // if is the first data
      if (index === 0) {
        date1 = timestamp;
        date2 = timestamp;
      } else {
        // get previous timestamp
        date1 = Math.abs(dataChats[index - 1].payload.val().timestamp);
        date2 = timestamp;
      }

      // get day diff chat before and after
      dayDiff = this.getDiffBetweenDate(date1, date2, 'days');

      // if day on chat before and after is not same and first data
      if (dayDiff > 0 || index === 0) {
        // make diff date
        const nameDay = moment(timestamp).format('ll');
        const chatDateOnly = { date: nameDay };
        chats.push(chatDateOnly);
      }

      // push chat to chats property
      chats.push(chat);
    });
    return chats;
  }

  /**
   * @desc event form chat 'enter' key
   */
  keyEnter($event) {
    if ($event.keyCode === 13 && !$event.shiftKey) {
      if (this.formChat.valid) {
        this.sendMessage();
        this.formChat.reset();
      } else {
        $event.preventDefault();
      }
    }
  }

  /**
   * @desc this will calculate diff between 2 Date
   * @param {Date | number} date1
   * @param {Date | number} date2
   * @param measurements
   * @return will return diff
   */
  getDiffBetweenDate(date1: Date | number, date2: Date | number, measurements: any) {
    const now = moment(date1); // todays date
    const end = moment(date2); // another date
    const diff = now.diff(end, measurements);
    return diff;
  }

  /**
   * @desc to move array
   */
  arraymove(arr: any[], fromIndex: number, toIndex: number) {
    const element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
    return arr;
  }

  /**
   * @desc this will add new custom validator
   * @param {FormControl} input
   * @return will return validator
   */
  trimMessage(input: FormControl) {
    if (input.value !== null) {
      const message = input.value.replace(/^\s+|\s+$/g, '').length === 0;
      return message ? { needMessage: true } : null;
    }
  }
}
