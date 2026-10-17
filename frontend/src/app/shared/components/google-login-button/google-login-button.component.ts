import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-google-login-button',
  standalone: true,
  imports: [],
  templateUrl: './google-login-button.component.html',
  styleUrl: './google-login-button.component.css',
})
export class GoogleLoginButtonComponent implements OnInit {
  private readonly authService = inject(AuthService, { optional: true });

  @Input() label = 'Iniciar sesión con Google';
  @Input() disabled = false;
  @Input() useNativeButton = false;
  @Output() loginClick = new EventEmitter<void>();

  @ViewChild('googleButtonContainer') googleButtonContainer?: ElementRef<HTMLDivElement>;

  readonly isNativeRendered = signal<boolean>(false);

  ngOnInit(): void {
    if (this.useNativeButton && this.authService) {
      this.tryRenderNativeButton();
    }
  }

  private tryRenderNativeButton(): void {
    if (!this.authService) return;
    setTimeout(() => {
      if (this.googleButtonContainer?.nativeElement && this.authService) {
        this.authService.renderButton(this.googleButtonContainer.nativeElement, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: 320,
          text: 'signin_with',
        });
        this.isNativeRendered.set(true);
      }
    }, 50);
  }

  onClick(): void {
    if (!this.disabled) {
      this.loginClick.emit();
    }
  }
}

