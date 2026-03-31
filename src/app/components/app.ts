import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from './toast-container/toast-container';
import { SessionWarning } from './session-warning/session-warning';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer, SessionWarning],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
}
