import { Component, OnInit } from '@angular/core';

import { MessageService } from '../../../services/message/message.service';
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  constructor(private messageService: MessageService) {}

  ngOnInit() {}
}
