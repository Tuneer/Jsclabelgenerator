import { Directive, ElementRef, HostListener, Output, EventEmitter } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[clickOutside]'
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event.target'])
  onClick(target: any): void {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
