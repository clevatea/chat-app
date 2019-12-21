import { NgModule } from '@angular/core';

import { FeatherModule } from 'angular-feather';
import { Lock, LogOut, Send } from 'angular-feather/icons';

// Select some icons (use an object, not an array)
const icons = {
  Lock,
  LogOut,
  Send
};

@NgModule({
  imports: [FeatherModule.pick(icons)],
  exports: [FeatherModule]
})
export class IconsModule {}
