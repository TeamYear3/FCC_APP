import { routes } from './app.routes';
import { Route } from '@angular/router';

describe('AppRoutes Title Configuration (TK239 / WCAG 2.4.2)', () => {
  function checkRouteTitles(routeList: Route[], parentPath = '') {
    routeList.forEach((route) => {
      const currentPath = parentPath ? `${parentPath}/${route.path}` : (route.path || '');

      if (!route.redirectTo) {
        it(`should have a non-empty string title for route: '${currentPath}'`, () => {
          expect(route.title).toBeDefined();
          expect(typeof route.title).toBe('string');
          expect((route.title as string).trim().length).toBeGreaterThan(0);
          expect((route.title as string)).toContain('FCC APP |');
        });
      }

      if (route.children && route.children.length > 0) {
        checkRouteTitles(route.children, currentPath);
      }
    });
  }

  checkRouteTitles(routes);
});
