import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoogleLoginButtonComponent } from './google-login-button.component';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';

describe('GoogleLoginButtonComponent', () => {
  let component: GoogleLoginButtonComponent;
  let fixture: ComponentFixture<GoogleLoginButtonComponent>;
  let mockAuthService: {
    renderButton: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockAuthService = {
      renderButton: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GoogleLoginButtonComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoogleLoginButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit loginClick event when clicked and not disabled', () => {
    const emitSpy = vi.spyOn(component.loginClick, 'emit');
    const buttonElement = fixture.debugElement.query(By.css('button'));
    buttonElement.triggerEventHandler('click', null);
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should not emit loginClick event when clicked and disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const emitSpy = vi.spyOn(component.loginClick, 'emit');
    component.onClick();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should call authService.renderButton when useNativeButton is true', async () => {
    component.useNativeButton = true;
    component.ngOnInit();

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(mockAuthService.renderButton).toHaveBeenCalled();
  });
});

