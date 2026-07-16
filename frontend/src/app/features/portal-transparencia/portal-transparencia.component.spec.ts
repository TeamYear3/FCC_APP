import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalTransparenciaComponent } from './portal-transparencia.component';
import { provideRouter } from '@angular/router';

describe('PortalTransparenciaComponent', () => {
  let component: PortalTransparenciaComponent;
  let fixture: ComponentFixture<PortalTransparenciaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalTransparenciaComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PortalTransparenciaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
