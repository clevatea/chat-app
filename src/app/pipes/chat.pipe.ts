import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'sanitizePipe'
})
export class SanitizePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: any, arg: number = 0): any {
    let val = '';

    if (!value) {
      return val;
    }

    val =
      arg === 1
        ? value.replace(/<(?:.|\n)*?>/gm, '')
        : this.sanitizer.sanitize(SecurityContext.HTML, value).replace(/<(?!br\s*\/?)[^>]+>/g, '');

    return val;
  }
}
