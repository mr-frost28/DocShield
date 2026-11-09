import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class UserDetailsService {
  constructor(private http: HttpClient) {}

  getUserDetails(userEmail: string): Observable<any> {
    const params = new HttpParams().set('userEmail', userEmail);
    return this.http.get<any>('https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/get_userdetails', { params });
  }

  // updateUserDetails(userDetails: any): Observable<any> {
  //   return this.http.put<any>('https://afyg15pn8i.execute-api.us-west-1.amazonaws.com/test/update_userdetails', userDetails);
  // }
}
