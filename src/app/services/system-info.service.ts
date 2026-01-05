import { Injectable } from '@angular/core';
import { Observable, interval, map, shareReplay, from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SystemInfoService {
  readonly ipAddress$: Observable<string>;
  readonly now$: Observable<Date>;

  constructor() {
    this.ipAddress$ = from(
      fetch('https://api.ipify.org?format=json').then((res) => res.json() as Promise<{ ip: string }>)
    ).pipe(
      map((res) => res.ip),
      shareReplay(1)
    );

    this.now$ = interval(1000).pipe(map(() => new Date()));
  }
}
