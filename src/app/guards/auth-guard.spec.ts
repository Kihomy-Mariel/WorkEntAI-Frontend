import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard, adminGuard, funcionarioGuard, roleRedirectGuard } from './auth-guard';

describe('Auth Guards', () => {
  let navigatedPaths: any[];

  beforeEach(() => {
    navigatedPaths = [];
    const routerMock = {
      navigate: (paths: any[]) => { navigatedPaths.push(paths); }
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock }
      ]
    });
    localStorage.clear();
  });

  describe('authGuard', () => {
    it('debe permitir acceso si hay token', () => {
      localStorage.setItem('token', 'fake-token');
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(true);
      expect(navigatedPaths.length).toBe(0);
    });

    it('debe denegar acceso y redirigir a login si no hay token', () => {
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(false);
      expect(navigatedPaths.length).toBe(1);
      expect(navigatedPaths[0]).toEqual(['/login']);
    });
  });

  describe('roleRedirectGuard', () => {
    it('debe redirigir a /admin si el rol es ADMIN', () => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('user', JSON.stringify({ rol: 'ADMIN' }));
      
      const result = TestBed.runInInjectionContext(() => roleRedirectGuard({} as any, {} as any));
      expect(result).toBe(false);
      expect(navigatedPaths.length).toBe(1);
      expect(navigatedPaths[0]).toEqual(['/admin']);
    });

    it('debe redirigir a /dashboard si el rol es FUNCIONARIO', () => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('user', JSON.stringify({ rol: 'FUNCIONARIO' }));
      
      const result = TestBed.runInInjectionContext(() => roleRedirectGuard({} as any, {} as any));
      expect(result).toBe(false);
      expect(navigatedPaths.length).toBe(1);
      expect(navigatedPaths[0]).toEqual(['/dashboard']);
    });

    it('debe redirigir a /login si no hay token', () => {
      const result = TestBed.runInInjectionContext(() => roleRedirectGuard({} as any, {} as any));
      expect(result).toBe(false);
      expect(navigatedPaths.length).toBe(1);
      expect(navigatedPaths[0]).toEqual(['/login']);
    });
  });
});
