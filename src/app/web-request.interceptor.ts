import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { throwError, Observable, empty, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebRequestInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  refreshingAccessToken: Boolean;

  accessTokenRefreshed: Subject<any> = new Subject();

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Handle the request

    request = this.addAuthHeader(request);

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log(error);

        if (error.status === 401) {
          // 401 -> Unauthorized

          // Refresh access token
          return this.refreshAccessToken().pipe(
            switchMap(() => {
              request = this.addAuthHeader(request);
              return next.handle(request);
            }),
            catchError((err: any) => {
              console.log(err);
              // Logout if token cannot be refreshed

              this.authService.logout();
              return empty();
            })
          );
        }
        return throwError(error);
      })
    );
  }

  refreshAccessToken() {
    if (this.refreshingAccessToken) {
      return new Observable((observer) => {
        this.accessTokenRefreshed.subscribe(() => {
          // This code will run when the access token has been refreshed
          // Provides signal to rerun request
          observer.next();
          observer.complete();
        });
      });
    } else {
      this.refreshingAccessToken = true;
      return this.authService.getNewAccessToken().pipe(
        tap(() => {
          this.refreshingAccessToken = false;
          console.log('Access Token Refreshed');
          this.accessTokenRefreshed.next();
        })
      );
    }
  }

  // Append the token to the request header
  addAuthHeader(request: HttpRequest<any>) {
    // Get the access token
    const token = this.authService.getAccessToken();

    if (token) {
      return request.clone({
        setHeaders: {
          'x-access-token': token,
        },
      });
    }
    return request;
  }
}
