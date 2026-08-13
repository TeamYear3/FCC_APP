import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccesoDenegadoComponent } from './acceso-denegado.component';
import { provideRouter } from '@angular/router';

describe('AccesoDenegadoComponent', () => {
  let component: AccesoDenegadoComponent;
  let fixture: ComponentFixture<AccesoDenegadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccesoDenegadoComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AccesoDenegadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
