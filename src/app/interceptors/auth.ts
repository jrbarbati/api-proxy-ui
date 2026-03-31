import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      // Only force-logout on 401 if the warning modal isn't already handling it
      if (err instanceof HttpErrorResponse && err.status === 401 && !auth.showWarning()) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
