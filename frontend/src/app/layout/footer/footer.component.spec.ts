import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe renderizar el elemento footer con data-testid="app-footer"', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const footerEl = compiled.querySelector('[data-testid="app-footer"]');
    expect(footerEl).not.toBeNull();
  });

  it('debe mostrar la versión de la aplicación en el contenedor de versión', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const versionEl = compiled.querySelector('[data-testid="footer-app-version"]');
    expect(versionEl).not.toBeNull();
    expect(versionEl?.textContent).toContain('Versión');
    expect(versionEl?.textContent).toContain(component.appVersion);
  });

  it('debe contener el año actual y la leyenda de derechos reservados', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(String(component.currentYear));
    expect(compiled.textContent).toContain('Todos los derechos reservados');
  });
});
