import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoogleLoginButtonComponent } from './google-login-button.component';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

describe('GoogleLoginButtonComponent', () => {
  let component: GoogleLoginButtonComponent;
  let fixture: ComponentFixture<GoogleLoginButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleLoginButtonComponent]
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
});
