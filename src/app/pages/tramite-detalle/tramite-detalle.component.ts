import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { Tramite } from '../../models/models';
import { TramiteService } from '../../services/tramite/tramite.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { AuthService } from '../../services/auth/auth.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-tramite-detalle',
  standalone: true,
  imports: [CommonModule, DatePipe, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar [activeRoute]="'/cliente'" [navItems]="navItems" />
      <main class="main-content">

        <div class="page-header">
          <div>
            <button class="btn-back" (click)="router.navigate(['/cliente'])">← Volver</button>
            <h1 class="page-title" style="margin-top:8px">
              Trámite {{ tramite?.numeroReferencia || '...' }}
            </h1>
            <p class="page-sub">{{ tramite?.nombrePolitica }}</p>
          </div>
          @if (tramite?.estado === 'COMPLETADO') {
            <button class="btn-primary" (click)="descargarPdf()">
              📄 Descargar PDF
            </button>
          }
        </div>

        @if (loading) {
          <div class="loading-state"><div class="spinner"></div><p>Cargando trámite...</p></div>
        }

        @if (!loading && tramite) {
          <!-- Estado actual -->
          <div class="glass-card estado-card">
            <div class="estado-header">
              <div class="estado-icon" [class.icon-nuevo]="tramite.estado === 'NUEVO'"
                [class.icon-proceso]="tramite.estado === 'EN_PROCESO'"
                [class.icon-completado]="tramite.estado === 'COMPLETADO'"
                [class.icon-rechazado]="tramite.estado === 'RECHAZADO'">
                {{ getEstadoIcon(tramite.estado) }}
              </div>
              <div>
                <h2 class="estado-titulo">{{ getEstadoLabel(tramite.estado) }}</h2>
                <p class="estado-sub">
                  @if (tramite.estado === 'EN_PROCESO') {
                    Actualmente en: <strong>{{ tramite.nombreNodoActual }}</strong>
                    — Departamento: <strong>{{ tramite.departamentoActual }}</strong>
                  } @else if (tramite.estado === 'COMPLETADO') {
                    Trámite finalizado el {{ tramite.fechaFin | date:'dd/MM/yyyy HH:mm' }}
                  } @else if (tramite.estado === 'NUEVO') {
                    Solicitud recibida, pendiente de revisión por el administrador
                  } @else {
                    Trámite rechazado
                  }
                </p>
              </div>
              <span class="badge ms-auto"
                [class.badge-nuevo]="tramite.estado === 'NUEVO'"
                [class.badge-proceso]="tramite.estado === 'EN_PROCESO'"
                [class.badge-completado]="tramite.estado === 'COMPLETADO'"
                [class.badge-rechazado]="tramite.estado === 'RECHAZADO'">
                {{ tramite.estado }}
              </span>
            </div>
          </div>

          <!-- Progreso visual -->
          <div class="glass-card" style="margin-bottom:20px">
            <h3 class="section-title">📍 Progreso del Trámite</h3>
            <div class="progreso-steps">
              @for (paso of pasos; track paso.nodoId; let i = $index) {
                <div class="paso" [class.paso-completado]="paso.completado"
                  [class.paso-actual]="paso.actual" [class.paso-pendiente]="!paso.completado && !paso.actual">
                  <div class="paso-circle">
                    @if (paso.completado) { ✓ }
                    @else if (paso.actual) { ● }
                    @else { {{ i + 1 }} }
                  </div>
                  <div class="paso-info">
                    <p class="paso-nombre">{{ paso.nombre }}</p>
                    <p class="paso-dept">{{ paso.departamento }}</p>
                    @if (paso.fecha) {
                      <p class="paso-fecha">{{ paso.fecha | date:'dd/MM HH:mm' }}</p>
                    }
                  </div>
                  @if (i < pasos.length - 1) {
                    <div class="paso-linea" [class.linea-completada]="paso.completado"></div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Info general -->
          <div class="info-grid">
            <div class="glass-card">
              <h3 class="section-title">📋 Información General</h3>
              <div class="info-list">
                <div class="info-row">
                  <span class="info-label">Referencia</span>
                  <span class="info-value mono">{{ tramite.numeroReferencia }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Política</span>
                  <span class="info-value">{{ tramite.nombrePolitica }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Descripción</span>
                  <span class="info-value">{{ tramite.descripcion || '—' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Prioridad</span>
                  <span class="info-value">
                    <span class="badge"
                      [class.badge-nuevo]="tramite.prioridad === 'ALTA'"
                      [class.badge-proceso]="tramite.prioridad === 'MEDIA'"
                      [class.badge-completado]="tramite.prioridad === 'BAJA'">
                      {{ tramite.prioridad }}
                    </span>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fecha inicio</span>
                  <span class="info-value mono">{{ tramite.fechaInicio | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                @if (tramite.fechaFin) {
                  <div class="info-row">
                    <span class="info-label">Fecha fin</span>
                    <span class="info-value mono">{{ tramite.fechaFin | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Duración total</span>
                    <span class="info-value">{{ formatDuracion(tramite.duracionMinutos) }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Historial -->
            <div class="glass-card">
              <h3 class="section-title">📜 Historial de Pasos</h3>
              @if (tramite.historial.length === 0) {
                <div class="empty-state">El trámite aún no ha iniciado</div>
              } @else {
                <div class="historial-list">
                  @for (h of tramite.historial; track h.nodoId) {
                    <div class="historial-item">
                      <div class="historial-dot" [class.dot-completado]="h.accion === 'COMPLETADO'"
                        [class.dot-rechazado]="h.accion === 'RECHAZADO'"></div>
                      <div class="historial-content">
                        <p class="historial-nodo">{{ h.nombreNodo }}</p>
                        <p class="historial-meta">
                          {{ h.departamento }} · {{ h.nombreFuncionario || 'Sistema' }}
                          @if (h.duracionMinutos) { · {{ h.duracionMinutos }} min }
                        </p>
                        @if (h.observacion) {
                          <p class="historial-obs">{{ h.observacion }}</p>
                        }
                        @if (h.resultadoDecision) {
                          <span class="badge" [class.badge-completado]="h.resultadoDecision === 'APROBADO'"
                            [class.badge-nuevo]="h.resultadoDecision === 'RECHAZADO'">
                            {{ h.resultadoDecision }}
                          </span>
                        }
                        <p class="historial-fecha">{{ h.fecha | date:'dd/MM/yyyy HH:mm' }}</p>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Datos formulario (si completado) -->
          @if (tramite.estado === 'COMPLETADO' && tramite.datosFormulario && objectKeys(tramite.datosFormulario).length > 0) {
            <div class="glass-card" style="margin-top:20px">
              <h3 class="section-title">📝 Datos Recopilados</h3>
              <div class="datos-grid">
                @for (key of objectKeys(tramite.datosFormulario); track key) {
                  <div class="dato-item">
                    <span class="dato-key">{{ key }}</span>
                    <span class="dato-val">{{ tramite.datosFormulario![key] }}</span>
                  </div>
                }
              </div>
            </div>
          }
        }

      </main>
    </div>
  `,
  styles: [`
    .btn-back {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 13px; font-family: inherit;
      padding: 0; margin-bottom: 4px;
    }
    .btn-back:hover { color: var(--primary); }
    .ms-auto { margin-left: auto; }

    .estado-card { margin-bottom: 20px; }
    .estado-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .estado-icon {
      width: 52px; height: 52px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; flex-shrink: 0;
    }
    .icon-nuevo      { background: hsl(355,80%,55%,0.12); }
    .icon-proceso    { background: hsl(20,89%,48%,0.12); }
    .icon-completado { background: hsl(142,60%,38%,0.12); }
    .icon-rechazado  { background: hsl(220,15%,65%,0.12); }
    .estado-titulo { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    .estado-sub { font-size: 13px; color: var(--text-muted); margin: 0; }

    .section-title { font-size: 14px; font-weight: 600; margin: 0 0 16px; }

    /* Progreso */
    .progreso-steps {
      display: flex; align-items: flex-start; gap: 0;
      overflow-x: auto; padding-bottom: 8px;
    }
    .paso {
      display: flex; flex-direction: column; align-items: center;
      min-width: 120px; position: relative; flex: 1;
    }
    .paso-circle {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; border: 2px solid var(--border-2);
      background: var(--bg-2); color: var(--text-muted); z-index: 1;
      transition: all 0.3s;
    }
    .paso-completado .paso-circle {
      background: var(--success); border-color: var(--success); color: white;
    }
    .paso-actual .paso-circle {
      background: var(--primary); border-color: var(--primary); color: white;
      box-shadow: 0 0 0 4px hsl(216,85%,50%,0.2);
    }
    .paso-info { text-align: center; margin-top: 8px; }
    .paso-nombre { font-size: 11px; font-weight: 600; margin: 0 0 2px; }
    .paso-dept { font-size: 10px; color: var(--text-muted); margin: 0; }
    .paso-fecha { font-size: 10px; color: var(--text-faint); margin: 2px 0 0; }
    .paso-linea {
      position: absolute; top: 18px; left: 50%; width: 100%;
      height: 2px; background: var(--border-2); z-index: 0;
    }
    .linea-completada { background: var(--success); }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .info-list { display: flex; flex-direction: column; gap: 10px; }
    .info-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .info-label { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
    .info-value { font-size: 13px; color: var(--text); text-align: right; }

    /* Historial */
    .historial-list { display: flex; flex-direction: column; gap: 12px; }
    .historial-item { display: flex; gap: 12px; }
    .historial-dot {
      width: 10px; height: 10px; border-radius: 50%;
      flex-shrink: 0; margin-top: 4px;
    }
    .dot-completado { background: var(--success); }
    .dot-rechazado  { background: var(--danger); }
    .historial-content { flex: 1; }
    .historial-nodo { font-size: 13px; font-weight: 600; margin: 0 0 2px; }
    .historial-meta { font-size: 11px; color: var(--text-muted); margin: 0 0 4px; }
    .historial-obs { font-size: 12px; color: var(--text); margin: 0 0 4px; font-style: italic; }
    .historial-fecha { font-size: 10px; color: var(--text-faint); margin: 4px 0 0; }

    /* Datos */
    .datos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .dato-item {
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px;
    }
    .dato-key { display: block; font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }
    .dato-val { font-size: 13px; font-weight: 500; color: var(--text); }

    @media (max-width: 900px) { .info-grid { grid-template-columns: 1fr; } }
  `]
})
export class TramiteDetalleComponent implements OnInit, OnDestroy {
  tramite: Tramite | null = null;
  loading = true;
  pasos: any[] = [];
  objectKeys = Object.keys;

  navItems: NavItem[] = [
    { icon: '🏠', label: 'Portal', route: '/cliente' },
    { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
  ];

  private wsSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private tramiteService: TramiteService,
    private wsService: WebSocketService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.cargarTramite(id);
    const user = this.authService.getUser();
    if (user) {
      this.wsService.conectar(user.id, user.rol, user.departamento);
      this.wsSub = this.wsService.notificaciones$.subscribe(() => this.cargarTramite(id));
    }
  }

  cargarTramite(id: string): void {
    this.tramiteService.getById(id).pipe(catchError(() => of(null))).subscribe(t => {
      this.tramite = t;
      if (t) this.construirPasos(t);
      this.loading = false;
    });
  }

  construirPasos(t: Tramite): void {
    const completados = t.historial.map(h => ({
      nodoId: h.nodoId,
      nombre: h.nombreNodo,
      departamento: h.departamento || '',
      completado: true,
      actual: false,
      fecha: h.fecha
    }));

    const actual = t.estado === 'EN_PROCESO' ? [{
      nodoId: t.nodoActualId,
      nombre: t.nombreNodoActual || 'En proceso',
      departamento: t.departamentoActual || '',
      completado: false,
      actual: true,
      fecha: null
    }] : [];

    this.pasos = [...completados, ...actual];
  }

  descargarPdf(): void {
    if (!this.tramite) return;
    this.tramiteService.descargarPdf(this.tramite.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tramite-${this.tramite!.numeroReferencia}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('Error al descargar el PDF')
    });
  }

  getEstadoIcon(estado: string): string {
    return { NUEVO: '🔴', EN_PROCESO: '🟡', COMPLETADO: '🟢', RECHAZADO: '⚫' }[estado] ?? '⚪';
  }

  getEstadoLabel(estado: string): string {
    return { NUEVO: 'Solicitud Recibida', EN_PROCESO: 'En Proceso', COMPLETADO: 'Completado', RECHAZADO: 'Rechazado' }[estado] ?? estado;
  }

  formatDuracion(min?: number | null): string {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  ngOnDestroy(): void {
    if (this.wsSub) this.wsSub.unsubscribe();
  }
}
