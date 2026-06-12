import { Routes } from '@angular/router';
import { authGuard, roleRedirectGuard, adminGuard, funcionarioGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing').then(m => m.Landing) },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  // ADMIN routes
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/reportes',
    loadComponent: () =>
      import('./pages/admin/reportes/reportes-dinamicos.component').then(m => m.ReportesDinamicosComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/cuellos-botella',
    loadComponent: () =>
      import('./pages/admin/cuellos/admin-cuellos.component').then(m => m.AdminCuellosComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/politicas',
    loadComponent: () =>
      import('./pages/admin/politicas/admin-politicas.component').then(m => m.AdminPoliticasComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/tramites',
    loadComponent: () =>
      import('./pages/admin/tramites/admin-tramites.component').then(m => m.AdminTramitesComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'editor',
    loadComponent: () =>
      import('./pages/editor/editor-layout/editor-layout.component').then(m => m.EditorLayoutComponent),
    canActivate: [authGuard]
  },
  {
    path: 'editor/:id',
    loadComponent: () =>
      import('./pages/editor/editor-layout/editor-layout.component').then(m => m.EditorLayoutComponent),
    canActivate: [authGuard]
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./pages/users/users.component').then(m => m.UsersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent),
    canActivate: [authGuard]
  },
  // FUNCIONARIO routes
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tarea/:id',
    loadComponent: () =>
      import('./pages/tarea-detalle/tarea-detalle.component').then(m => m.TareaDetalleComponent),
    canActivate: [authGuard]
  },
  // CLIENTE routes
  {
    path: 'cliente',
    loadComponent: () =>
      import('./pages/cliente-portal/cliente-portal.component').then(m => m.ClientePortalComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tramite/:id',
    loadComponent: () =>
      import('./pages/tramite-detalle/tramite-detalle.component').then(m => m.TramiteDetalleComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tramite/:id/documentos',
    loadComponent: () =>
      import('./pages/repositorio-documental/repositorio-documental.component').then(m => m.RepositorioDocumentalComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tramite/:id/documentos/auditoria',
    loadComponent: () =>
      import('./pages/admin/auditoria/auditoria-documental.component').then(m => m.AuditoriaDocumentalComponent),
    canActivate: [authGuard]
  },
  {
    path: 'colaborar/:docId',
    loadComponent: () =>
      import('./pages/documentos/editor-colaborativo/editor-colaborativo.component').then(m => m.EditorColaborativoComponent),
    canActivate: [authGuard]
  },
  // Profile
  {
    path: 'perfil',
    loadComponent: () =>
      import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
    canActivate: [authGuard]
  },
  // ── Ciclo 2 ──────────────────────────────────────────────────────
  // Agente IA — CLIENTE (CU-22/23)
  {
    path: 'agente',
    loadComponent: () =>
      import('./pages/agente-ia/agente-ia.component').then(m => m.AgenteIaComponent),
    canActivate: [authGuard]
  },
  // Reportes NLP — ADMIN (CU-30)
  {
    path: 'reportes',
    loadComponent: () =>
      import('./pages/reportes/reportes.component').then(m => m.ReportesComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'login' }
];
