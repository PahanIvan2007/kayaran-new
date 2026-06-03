import { Component, Input, OnInit, ElementRef, signal } from '@angular/core';

@Component({
  selector: 'app-qr',
  template: `
    @if (dataUrl()) {
      <img [src]="dataUrl()" [style.width.px]="size" [style.height.px]="size" alt="QR" class="qr-img">
    } @else {
      <div class="qr-placeholder" [style.width.px]="size" [style.height.px]="size">{{ value.slice(0,2) }}</div>
    }
  `,
})
export class QrComponent implements OnInit {
  @Input() value = '';
  @Input() size = 100;
  dataUrl = signal('');

  async ngOnInit() {
    try {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(this.value, {
        width: this.size * 2,
        margin: 1,
        color: { dark: '#f1f5f9', light: 'transparent' },
      });
      this.dataUrl.set(url);
    } catch {
      // fallback: show placeholder
    }
  }
}
