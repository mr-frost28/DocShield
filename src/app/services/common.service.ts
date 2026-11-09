import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, delay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  public loader: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {}

  showLoader(): void {
    this.loader.next(true);
  }

  hideLoader(): void {
    this.loader.next(false);
  }
}
