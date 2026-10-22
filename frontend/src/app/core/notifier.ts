import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** One place to tell the user what just happened. Short messages, dismissable, announced to screen readers. */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string) {
    this.snackBar.open(message, 'Dismiss', { duration: 5000 });
  }

  /** Errors stay until dismissed so they are not missed. */
  error(message: string) {
    this.snackBar.open(message, 'Dismiss', { duration: 0, politeness: 'assertive' });
  }
}
