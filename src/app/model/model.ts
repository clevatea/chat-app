export class User {
  constructor(public username: string) {}
}

export class ListUser {
  constructor(public name: string, public nameRoom: string, public lastMessage?: object, public unread?: number) {}
}

export class Message {
  constructor(public name: string, public chat: string, public time: string, public timestamp: number) {}
}
