import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { WebRequestService } from './web-request.service';
import { Router } from '@angular/router';
import { shareReplay, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private webService: WebRequestService, private router: Router) {}

  login(email: string, password: string) {
    // Make a web request to the API
    // Body containing email and password
    return this.webService.login(email, password).pipe(
      // shareReplay prevents login from beign called multiple times
      shareReplay(),
      tap((res: HttpResponse<any>) => {
        // Get auth tokens from header of the response
        this.setSession(
          res.body._id,
          res.headers.get('x-access-token'),
          res.headers.get('x-refresh-token')
        );
        console.log('Logged In');
      })
    );
  }

  logout() {
    this.removeSession();
    this.router.navigateByUrl('/login');
  }

  getRefreshToken() {
    return localStorage.getItem('x-refresh-token');
  }

  getAccessToken() {
    return localStorage.getItem('x-access-item');
  }

  setAccessToken(accessToken: string) {
    localStorage.setItem('x-access-token', accessToken);
  }

  private setSession(
    userId: string,
    accessToken: string,
    refreshToken: string
  ) {
    localStorage.setItem('user-id', userId);
    localStorage.setItem('access-token', accessToken);
    localStorage.setItem('refresh-token', refreshToken);
  }

  private removeSession() {
    localStorage.removeItem('user-id');
    localStorage.removeItem('access-token');
    localStorage.removeItem('refresh-token');
  }
}
