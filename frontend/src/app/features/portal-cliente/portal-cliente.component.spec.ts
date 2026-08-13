import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalClienteComponent } from './portal-cliente.component';
import { provideRouter } from '@angular/router';

describe('PortalClienteComponent', () => {
  let component: PortalClienteComponent;
  let fixture: ComponentFixture<PortalClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalClienteComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PortalClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
