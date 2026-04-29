import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth/auth.service';
import { PoliticaService } from '../../services/politica/politica.service';
import { TramiteService } from '../../services/tramite/tramite.service';
import { AIService } from '../../services/ai/ai.service';
import { NotificacionService } from '../../services/notificacion/notificacion.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { Politica, Tramite, Notificacion } from '../../models/models';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AIResult {
  totalTareas: number;
  promedioMinutos: number;
  cuellos: { nodo: string; excesoPct: number }[];
  recomendacion: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, SidebarComponent, DatePipe],
  template: `
    <div class="admin-layout">
      <app-sidebar [activeRoute]="'/admin'" [navItems]="navItems" />
      <div class="admin-main">

        <!-- HEADER -->
        <div class="admin-header">
          <div class="header-left">
            <h1 class="header-title">Panel de Administración</h1>
            <p class="header-sub">Gestión de políticas, trámites y notificaciones</p>
          </div>
          <div class="header-right">
            <button class="btn-reload" (click)="loadData()" [disabled]="loading">
              @if (loading) {
                <span class="spinner-sm"></span> Cargando...
              } @else {
                🔄 Recargar datos
              }
            </button>
            <div class="notif-btn" (click)="toggleNotifPanel()">
              🔔
              @if (notificaciones.length > 0) {
                <span class="notif-badge">{{ notificaciones.length }}</span>
              }
            </div>
          </div>
        </div>

        <!-- CONTENT -->
        <div class="admin-content">

          <!-- LOADING STATE -->
          @if (loading) {
            <div class="loading-overlay">
              <div class="spinner"></div>
              <p>Cargando datos...</p>
            </div>
          } @else {

            <!-- STATS ROW -->
            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-icon">📋</div>
                <div class="stat-info">
                  <p class="stat-value">{{ politicas.length }}</p>
                  <p class="stat-label">Políticas totales</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-info">
                  <p class="stat-value">{{ politicasActivas }}</p>
                  <p class="stat-label">Políticas activas</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">📁</div>
                <div class="stat-info">
                  <p class="stat-value">{{ tramites.length }}</p>
                  <p class="stat-label">Trámites totales</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-info">
                  <p class="stat-value">{{ tramitesEnProceso }}</p>
                  <p class="stat-label">En proceso</p>
                </div>
              </div>
            </div>

            <!-- POLITICAS SECTION -->
            <div class="section-card">
              <div class="section-header">
                <h2 class="section-title">📋 Políticas de Flujo</h2>
              </div>
              @if (politicas.length === 0) {
                <p class="empty-msg">No hay políticas registradas.</p>
              } @else {
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Estado</th>
                        <th>Categoría</th>
                        <th>Creado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of politicas; track p.id) {
                        <tr>
                          <td>
                            <p class="cell-title">{{ p.nombre }}</p>
                            <p class="cell-sub">{{ p.descripcion }}</p>
                          </td>
                          <td>
                            <span class="badge" [class]="badgeClass(p.estado)">{{ p.estado }}</span>
                          </td>
                          <td>{{ p.categoria || '—' }}</td>
                          <td>{{ p.fechaCreacion | date:'dd/MM/yyyy' }}</td>
                          <td>
                            <div class="action-btns">
                              @if (p.estado !== 'ACTIVA') {
                                <button class="btn-sm btn-success" (click)="activarPolitica(p.id, p.nombre)"
                                  [disabled]="actionLoading[p.id]">
                                  @if (actionLoading[p.id]) { ⏳ } @else { ✅ Activar }
                                </button>
                              }
                              <button class="btn-sm btn-ai" (click)="analizarIA(p.id, p.nombre)"
                                [disabled]="actionLoading['ai_' + p.id]">
                                @if (actionLoading['ai_' + p.id]) { ⏳ } @else { 🤖 IA }
                              </button>
                              <button class="btn-sm btn-danger" (click)="deletePolitica(p.id, p.nombre)"
                                [disabled]="actionLoading['del_' + p.id]">
                                @if (actionLoading['del_' + p.id]) { ⏳ } @else { 🗑️ }
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <!-- AI RESULT SECTION -->
            @if (aiResult) {
              <div class="section-card ai-card">
                <div class="section-header">
                  <h2 class="section-title">🤖 Análisis IA — {{ aiPoliticaNombre }}</h2>
                  <button class="btn-sm btn-outline" (click)="aiResult = null">✕ Cerrar</button>
                </div>
                <div class="ai-grid">
                  <div class="ai-stat">
                    <p class="ai-stat-val">{{ aiResult.totalTareas }}</p>
                    <p class="ai-stat-lbl">Tareas analizadas</p>
                  </div>
                  <div class="ai-stat">
                    <p class="ai-stat-val">{{ aiResult.promedioMinutos | number:'1.0-1' }} min</p>
                    <p class="ai-stat-lbl">Promedio general</p>
                  </div>
                  <div class="ai-stat">
                    <p class="ai-stat-val">{{ aiResult.cuellos.length }}</p>
                    <p class="ai-stat-lbl">Cuellos detectados</p>
                  </div>
                </div>
                @if (aiResult.cuellos.length > 0) {
                  <div class="ai-bottlenecks">
                    <h4 class="ai-sub">Cuellos de botella detectados</h4>
                    @for (c of aiResult.cuellos; track c.nodo) {
                      <div class="bottleneck-item">
                        <span class="bottleneck-name">{{ c.nodo }}</span>
                        <span class="bottleneck-pct">+{{ c.excesoPct | number:'1.0-1' }}% exceso</span>
                      </div>
                    }
                  </div>
                }
                @if (aiResult.recomendacion) {
                  <div class="ai-recommendation">
                    <h4 class="ai-sub">💡 Recomendación</h4>
                    <p>{{ aiResult.recomendacion }}</p>
                  </div>
                }
              </div>
            }

            <!-- TRAMITES SECTION -->
            <div class="section-card">
              <div class="section-header">
                <h2 class="section-title">📁 Trámites</h2>
              </div>
              @if (tramites.length === 0) {
                <p class="empty-msg">No hay trámites registrados.</p>
              } @else {
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Política</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Inicio</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (t of tramites; track t.id) {
                        <tr>
                          <td><code class="ref-code">{{ t.numeroReferencia || t.id.slice(0,8) }}</code></td>
                          <td>{{ t.nombrePolitica || '—' }}</td>
                          <td>{{ t.nombreCliente || '—' }}</td>
                          <td><span class="badge" [class]="badgeTramite(t.estado)">{{ t.estado }}</span></td>
                          <td>{{ t.fechaInicio | date:'dd/MM/yyyy' }}</td>
                          <td>
                            @if (t.estado === 'NUEVO') {
                              <button class="btn-sm btn-success" (click)="iniciarTramite(t.id, t.numeroReferencia || t.id.slice(0,8))"
                                [disabled]="actionLoading['tr_' + t.id]">
                                @if (actionLoading['tr_' + t.id]) { ⏳ } @else { ▶️ Iniciar }
                              </button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <!-- NOTIFICACIONES SECTION -->
            <div class="section-card">
              <div class="section-header">
                <h2 class="section-title">🔔 Notificaciones no leídas</h2>
                @if (notificaciones.length > 0) {
                  <button class="btn-sm btn-outline" (click)="marcarTodasLeidas()">✅ Marcar todas leídas</button>
                }
              </div>
              @if (notificaciones.length === 0) {
                <p class="empty-msg">No hay notificaciones pendientes.</p>
              } @else {
                <div class="notif-list">
                  @for (n of notificaciones; track n.id) {
                    <div class="notif-item">
                      <div class="notif-body">
                        <p class="notif-msg">{{ n.mensaje }}</p>
                        <p class="notif-date">{{ n.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</p>
                      </div>
                      <button class="btn-sm btn-outline" (click)="marcarLeida(n.id)"
                        [disabled]="actionLoading['notif_' + n.id]">
                        @if (actionLoading['notif_' + n.id]) { ⏳ } @else { ✓ Leída }
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

          }
        </div>
      </div>
    </div>

    <!-- TOASTS -->
    <div class="toast-container">
      @for (toast of toasts; track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type">
          @if (toast.type === 'success') { ✅ }
          @if (toast.type === 'error') { ❌ }
          @if (toast.type === 'info') { ℹ️ }
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: contents; }

    /* LAYOUT */
    .admin-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg, #0f172a);
      color: var(--text, #e2e8f0);
      font-family: 'Space Grotesk', sans-serif;
    }
    .admin-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .admin-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 28px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .header-title { font-size: 20px; font-weight: 700; margin: 0; }
    .header-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin: 2px 0 0; }
    .header-right { display: flex; align-items: center; gap: 12px; }
    .admin-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
    }

    /* STATS */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .stat-icon { font-size: 28px; }
    .stat-value { font-size: 24px; font-weight: 700; margin: 0; }
    .stat-label { font-size: 11px; color: rgba(255,255,255,0.4); margin: 2px 0 0; }

    /* SECTION CARD */
    .section-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .section-title { font-size: 15px; font-weight: 600; margin: 0; }
    .empty-msg { color: rgba(255,255,255,0.35); font-size: 13px; text-align: center; padding: 24px 0; }

    /* TABLE */
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th {
      text-align: left;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      color: rgba(255,255,255,0.4);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      vertical-align: middle;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .cell-title { margin: 0; font-weight: 500; }
    .cell-sub { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); }
    .ref-code {
      background: rgba(255,255,255,0.07);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-activa { background: rgba(34,197,94,0.15); color: #4ade80; }
    .badge-borrador { background: rgba(234,179,8,0.15); color: #facc15; }
    .badge-inactiva { background: rgba(100,116,139,0.15); color: #94a3b8; }
    .badge-nuevo { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .badge-proceso { background: rgba(234,179,8,0.15); color: #facc15; }
    .badge-completado { background: rgba(34,197,94,0.15); color: #4ade80; }
    .badge-rechazado { background: rgba(239,68,68,0.15); color: #f87171; }

    /* BUTTONS */
    .btn-reload {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px;
      background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3);
      color: #60a5fa; font-size: 13px; cursor: pointer;
      font-family: inherit; transition: all 0.2s;
    }
    .btn-reload:hover:not(:disabled) { background: rgba(59,130,246,0.25); }
    .btn-reload:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm {
      padding: 5px 10px; border-radius: 6px; font-size: 12px;
      cursor: pointer; border: none; font-family: inherit;
      transition: all 0.2s; white-space: nowrap;
    }
    .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-success { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .btn-success:hover:not(:disabled) { background: rgba(34,197,94,0.25); }
    .btn-danger { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
    .btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.25); }
    .btn-ai { background: rgba(139,92,246,0.15); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.3); }
    .btn-ai:hover:not(:disabled) { background: rgba(139,92,246,0.25); }
    .btn-outline { background: transparent; color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.15); }
    .btn-outline:hover:not(:disabled) { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.8); }
    .action-btns { display: flex; gap: 6px; flex-wrap: wrap; }

    /* NOTIF BUTTON */
    .notif-btn {
      position: relative; width: 38px; height: 38px;
      border-radius: 8px; background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 18px;
    }
    .notif-badge {
      position: absolute; top: -4px; right: -4px;
      background: #ef4444; color: white;
      border-radius: 10px; padding: 1px 5px;
      font-size: 10px; font-weight: 700;
    }

    /* NOTIF LIST */
    .notif-list { display: flex; flex-direction: column; gap: 8px; }
    .notif-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
    }
    .notif-body { flex: 1; min-width: 0; margin-right: 12px; }
    .notif-msg { margin: 0; font-size: 13px; }
    .notif-date { margin: 3px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); }

    /* AI CARD */
    .ai-card { border-color: rgba(139,92,246,0.3); }
    .ai-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 16px; margin-bottom: 20px;
    }
    .ai-stat {
      background: rgba(139,92,246,0.1); border-radius: 10px;
      padding: 14px; text-align: center;
    }
    .ai-stat-val { font-size: 22px; font-weight: 700; margin: 0; color: #c4b5fd; }
    .ai-stat-lbl { font-size: 11px; color: rgba(255,255,255,0.4); margin: 4px 0 0; }
    .ai-sub { font-size: 13px; font-weight: 600; margin: 0 0 10px; color: rgba(255,255,255,0.7); }
    .ai-bottlenecks { margin-bottom: 16px; }
    .bottleneck-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px; background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; margin-bottom: 6px;
    }
    .bottleneck-name { font-size: 13px; }
    .bottleneck-pct { font-size: 12px; color: #f87171; font-weight: 600; }
    .ai-recommendation {
      background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2);
      border-radius: 10px; padding: 14px;
    }
    .ai-recommendation p { margin: 0; font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.8); }

    /* LOADING */
    .loading-overlay {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 0; gap: 16px;
      color: rgba(255,255,255,0.4);
    }
    .spinner {
      width: 36px; height: 36px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #3b82f6;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm {
      display: inline-block; width: 14px; height: 14px;
      border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);
      border-top-color: #60a5fa;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* TOASTS */
    .toast-container {
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column; gap: 8px;
      z-index: 9999; max-width: 380px;
    }
    .toast {
      padding: 12px 16px; border-radius: 10px;
      font-size: 13px; font-weight: 500;
      display: flex; align-items: flex-start; gap: 8px;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      line-height: 1.4;
    }
    .toast-success { background: #14532d; border: 1px solid #16a34a; color: #bbf7d0; }
    .toast-error { background: #450a0a; border: 1px solid #dc2626; color: #fecaca; }
    .toast-info { background: #1e3a5f; border: 1px solid #2563eb; color: #bfdbfe; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    @media (max-width: 1100px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .ai-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 700px) {
      .admin-content { padding: 16px; }
      .stats-row { grid-template-columns: 1fr 1fr; }
      .admin-header { padding: 12px 16px; }
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  user: any;
  politicas: Politica[] = [];
  tramites: Tramite[] = [];
  notificaciones: Notificacion[] = [];
  loading = true;
  actionLoading: Record<string, boolean> = {};
  toasts: Toast[] = [];
  private toastCounter = 0;
  aiResult: AIResult | null = null;
  aiPoliticaNombre = '';
  private wsSub?: Subscription;

  navItems: NavItem[] = [
    { icon: '📊', label: 'Panel Principal', route: '/admin' },
    { icon: '✏️', label: 'Editor de Políticas', route: '/editor' },
    { icon: '📈', label: 'Analytics', route: '/analytics' },
    { icon: '👥', label: 'Usuarios', route: '/users' },
    { icon: '👤', label: 'Mi Perfil', route: '/perfil' },
  ];

  constructor(
    private authService: AuthService,
    private politicaService: PoliticaService,
    private tramiteService: TramiteService,
    private aiService: AIService,
    private notificacionService: NotificacionService,
    private wsService: WebSocketService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadData();
    if (this.user?.id) {
      this.wsService.conectar(this.user.id, this.user.rol);
      this.wsSub = this.wsService.notificaciones$.subscribe(msg => {
        this.showToast('info', msg.mensaje || 'Nueva notificación');
        if (this.user?.id) {
          this.notificacionService.getNoLeidas(this.user.id).subscribe({
            next: (n) => (this.notificaciones = n),
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsService.desconectar();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      politicas: this.politicaService.getAll(),
      tramites: this.tramiteService.getAll(),
    }).subscribe({
      next: ({ politicas, tramites }) => {
        this.politicas = politicas;
        this.tramites = tramites;
        this.loading = false;
        if (this.user?.id) {
          this.notificacionService.getNoLeidas(this.user.id).subscribe({
            next: (n) => (this.notificaciones = n),
            error: () => {},
          });
        }
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('error', 'Error al cargar datos: ' + msg);
      },
    });
  }

  get politicasActivas(): number {
    return this.politicas.filter((p) => p.estado === 'ACTIVA').length;
  }

  get tramitesEnProceso(): number {
    return this.tramites.filter((t) => t.estado === 'EN_PROCESO').length;
  }

  activarPolitica(id: string, nombre: string): void {
    this.actionLoading[id] = true;
    this.politicaService.activar(id).subscribe({
      next: () => {
        this.actionLoading[id] = false;
        const idx = this.politicas.findIndex((p) => p.id === id);
        if (idx !== -1) this.politicas[idx].estado = 'ACTIVA';
        this.showToast('success', `Política "${nombre}" activada correctamente.`);
      },
      error: (err) => {
        this.actionLoading[id] = false;
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('error', `No se pudo activar "${nombre}": ${msg}`);
      },
    });
  }

  deletePolitica(id: string, nombre: string): void {
    const confirmed = confirm(
      `¿Eliminar la política "${nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    this.actionLoading['del_' + id] = true;
    this.politicaService.delete(id).subscribe({
      next: () => {
        this.actionLoading['del_' + id] = false;
        this.politicas = this.politicas.filter((p) => p.id !== id);
        this.showToast('success', `Política "${nombre}" eliminada correctamente.`);
      },
      error: (err) => {
        this.actionLoading['del_' + id] = false;
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('error', `No se pudo eliminar "${nombre}": ${msg}`);
      },
    });
  }

  iniciarTramite(tramiteId: string, ref: string): void {
    this.actionLoading['tr_' + tramiteId] = true;
    this.tramiteService.iniciarPorAdmin(tramiteId).subscribe({
      next: (updated) => {
        this.actionLoading['tr_' + tramiteId] = false;
        const idx = this.tramites.findIndex((t) => t.id === tramiteId);
        if (idx !== -1) this.tramites[idx] = updated;
        this.showToast('success', `Trámite ${ref} iniciado correctamente.`);
      },
      error: (err) => {
        this.actionLoading['tr_' + tramiteId] = false;
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('error', `No se pudo iniciar el trámite ${ref}: ${msg}`);
      },
    });
  }

  analizarIA(politicaId: string, nombre: string): void {
    this.actionLoading['ai_' + politicaId] = true;
    this.aiPoliticaNombre = nombre;
    this.aiResult = null;
    this.aiService.detectarCuellosBottella(politicaId).subscribe({
      next: (res: any) => {
        this.actionLoading['ai_' + politicaId] = false;
        this.aiResult = this.parseAIResult(res);
        this.showToast('success', `Análisis IA completado para "${nombre}".`);
      },
      error: (err) => {
        this.actionLoading['ai_' + politicaId] = false;
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('error', `Error en análisis IA de "${nombre}": ${msg}`);
      },
    });
  }

  private parseAIResult(res: any): AIResult {
    const cuellos: { nodo: string; excesoPct: number }[] = [];
    if (Array.isArray(res.cuellosBottella)) {
      for (const c of res.cuellosBottella) {
        cuellos.push({
          nodo: c.nombreNodo || c.nodo || c.nodeId || 'Nodo desconocido',
          excesoPct: c.excesoPorcentaje ?? c.excesoPct ?? c.excess ?? 0,
        });
      }
    }
    return {
      totalTareas: res.totalTareas ?? res.totalTasks ?? 0,
      promedioMinutos: res.promedioMinutos ?? res.averageMinutes ?? 0,
      cuellos,
      recomendacion: res.recomendacion ?? res.recommendation ?? '',
    };
  }

  marcarLeida(id: string): void {
    this.actionLoading['notif_' + id] = true;
    this.notificacionService.marcarLeida(id).subscribe({
      next: () => {
        this.actionLoading['notif_' + id] = false;
        this.notificaciones = this.notificaciones.filter((n) => n.id !== id);
        this.showToast('success', 'Notificación marcada como leída.');
      },
      error: (err) => {
        this.actionLoading['notif_' + id] = false;
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('error', `No se pudo marcar la notificación: ${msg}`);
      },
    });
  }

  marcarTodasLeidas(): void {
    if (!this.user?.id) return;
    this.notificacionService.marcarTodasLeidas(this.user.id).subscribe({
      next: () => {
        this.notificaciones = [];
        this.showToast('success', 'Todas las notificaciones marcadas como leídas.');
      },
      error: (err) => {
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('error', `Error al marcar notificaciones: ${msg}`);
      },
    });
  }

  toggleNotifPanel(): void {
    if (this.notificaciones.length === 0) {
      this.showToast('info', 'No tienes notificaciones pendientes.');
    }
  }

  badgeClass(estado: string): string {
    const map: Record<string, string> = {
      ACTIVA: 'badge badge-activa',
      BORRADOR: 'badge badge-borrador',
      INACTIVA: 'badge badge-inactiva',
    };
    return map[estado] ?? 'badge';
  }

  badgeTramite(estado: string): string {
    const map: Record<string, string> = {
      NUEVO: 'badge badge-nuevo',
      EN_PROCESO: 'badge badge-proceso',
      COMPLETADO: 'badge badge-completado',
      RECHAZADO: 'badge badge-rechazado',
    };
    return map[estado] ?? 'badge';
  }

  showToast(type: 'success' | 'error' | 'info', message: string): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, 4000);
  }
}
