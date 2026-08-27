import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente el componente administrador', () => {
    expect(component).toBeTruthy();
  });

  it('debe cambiar de pestaña activamente', () => {
    expect(component.activeTab()).toBe('facturacion');
    component.setTab('calendario');
    expect(component.activeTab()).toBe('calendario');
    component.setTab('usuarios');
    expect(component.activeTab()).toBe('usuarios');
  });
});
