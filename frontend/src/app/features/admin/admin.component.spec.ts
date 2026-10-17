import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminComponent } from './admin.component';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AdminComponent (TK143 - Sidebar Drawer & Overlay)', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente el componente administrador como Layout Shell', () => {
    expect(component).toBeTruthy();
    expect(component.sidebarService).toBeTruthy();
    expect(component.authService).toBeTruthy();
  });

  it('debe renderizar el overlay y cerrarlo al hacer clic con stopPropagation (TK143)', () => {
    component.sidebarService.isSidebarOpen.set(true);
    fixture.detectChanges();

    const overlay = fixture.debugElement.query(By.css('.backdrop-blur-sm.z-40'));
    expect(overlay).toBeTruthy();

    const closeSpy = vi.spyOn(component.sidebarService, 'closeSidebar');
    const mockEvent = new MouseEvent('click');
    const stopSpy = vi.spyOn(mockEvent, 'stopPropagation');

    overlay.triggerEventHandler('click', mockEvent);

    expect(stopSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });
});
