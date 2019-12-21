import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { environment } from '../environments/environment';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IconsModule } from './icons/icons.module';

import { ModalModule } from 'ngx-bootstrap/modal';
import { AngularFireModule } from '@angular/fire';
import { AngularFireDatabaseModule } from '@angular/fire/database';
import { AngularFireAuthModule } from '@angular/fire/auth';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/partials/header/header.component';
import { MessageComponent } from './components/message/message.component';
import { SidebarComponent } from './components/partials/sidebar/sidebar.component';
import { AuthComponent } from './components/partials/auth/auth.component';
import { SanitizePipe } from './pipes/chat.pipe';
import { ChatComponent } from './components/partials/chat/chat.component';
import { ScrollableDirective } from './directive/scrollable.directive';
@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    MessageComponent,
    SidebarComponent,
    AuthComponent,
    SanitizePipe,
    ChatComponent,
    ScrollableDirective
  ],
  imports: [
    BrowserModule,
    IconsModule,
    ReactiveFormsModule,
    FormsModule,
    AppRoutingModule,
    ModalModule.forRoot(),
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFireDatabaseModule
  ],
  providers: [SanitizePipe],
  bootstrap: [AppComponent]
})
export class AppModule {}
