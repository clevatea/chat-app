import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MessageComponent } from './components/message/message.component';

const routes: Routes = [
  {
    path: '',
    component: MessageComponent
  },
  {
    path: ':room',
    component: MessageComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
