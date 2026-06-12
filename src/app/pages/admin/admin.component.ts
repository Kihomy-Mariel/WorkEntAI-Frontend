import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { SidebarComponent, NavItem, ADMIN_NAV_ITEMS } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth/auth.service';
import { PoliticaService } from '../../services/politica/politica.service';
import { TramiteService } from '../../services/tramite/tramite.service';
import { AIService } from '../../services/ai/ai.service';
import { NotificacionService } from '../../services/notificacion/notificacion.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { Politica, Tramite, Notificacion, Nodo } from '../../models/models';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';

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
  imports: [CommonModule, SidebarComponent, DatePipe, RouterModule, BaseChartDirective],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, OnDestroy {
  politicas: Politica[] = [];
  tramites: Tramite[] = [];
  notificaciones: Notificacion[] = [];
  loading = false;
  user: any = null;
  toasts: Toast[] = [];
  toastCounter = 0;
  actionLoading: Record<string, boolean> = {};

  aiResult: AIResult | null = null;
  aiPoliticaNombre = '';

  private subs: Subscription = new Subscription();

  showDiagramaModal = false;
  politicaVisualizando: Politica | null = null;
  showNotifs = false;

  navItems = ADMIN_NAV_ITEMS;

  // Gráficos
  public chartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#e2e8f0', font: { family: 'Space Grotesk' } } }
    },
    cutout: '75%'
  };

  public estadoTramitesData: ChartData<'doughnut'> = {
    labels: ['Nuevo', 'En Proceso', 'Completado', 'Rechazado'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#60a5fa', '#facc15', '#4ade80', '#f87171'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, beginAtZero: true }
    },
    elements: { line: { tension: 0.4 }, point: { radius: 0 } }
  };

  public trendData: ChartData<'line'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [{
      data: [12, 19, 15, 25, 22, 30],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      borderWidth: 2
    }]
  };

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, beginAtZero: true }
    }
  };

  public barData: ChartData<'bar'> = {
    labels: ['RRHH', 'Finanzas', 'TI', 'Legal'],
    datasets: [{
      data: [45, 25, 60, 15],
      backgroundColor: ['#c084fc', '#facc15', '#60a5fa', '#f87171'],
      borderRadius: 6
    }]
  };

  constructor(
    private authService: AuthService,
    private politicaService: PoliticaService,
    private tramiteService: TramiteService,
    private notificacionService: NotificacionService,
    private aiService: AIService,
    private wsService: WebSocketService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadData();
    this.wsService.conectar(this.user?.id || 'admin', this.user?.rol || 'ADMIN', this.user?.departamento || '');
    this.subs.add(
      this.wsService.notificaciones$.subscribe((n: any) => {
        if (n && (!n.usuarioId || n.usuarioId === this.user?.id)) {
          this.notificaciones.unshift(n);
          this.showToast('info', `Nueva Notificación: ${n.mensaje}`);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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
        this.updateKPIs();
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
        this.showToast('error', 'Error al cargar datos: ' + (err.error?.error || err.message));
      },
    });
  }

  updateKPIs(): void {
    const nuevos = this.tramites.filter(t => t.estado === 'NUEVO').length;
    const enProceso = this.tramites.filter(t => t.estado === 'EN_PROCESO').length;
    const completados = this.tramites.filter(t => t.estado === 'COMPLETADO').length;
    const rechazados = this.tramites.filter(t => t.estado === 'RECHAZADO').length;
    
    this.estadoTramitesData = {
      labels: ['Nuevo', 'En Proceso', 'Completado', 'Rechazado'],
      datasets: [{
        data: [nuevos, enProceso, completados, rechazados],
        backgroundColor: ['#60a5fa', '#facc15', '#4ade80', '#f87171'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }

  // KPIs calculados
  get politicasActivas(): number { return this.politicas.filter((p) => p.estado === 'ACTIVA').length; }
  get tramitesEnProceso(): number { return this.tramites.filter((t) => t.estado === 'EN_PROCESO').length; }
  get tramitesCompletados(): number { return this.tramites.filter((t) => t.estado === 'COMPLETADO').length; }
  
  get kpiEficiencia(): number {
    if (this.tramites.length === 0) return 0;
    return Math.round((this.tramitesCompletados / this.tramites.length) * 100);
  }

  get kpiAtrasados(): number {
    // Simulación: 15% de los en proceso están atrasados (lógica real dependería de SLAs en tareas)
    return Math.floor(this.tramitesEnProceso * 0.15);
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
        this.showToast('error', `No se pudo activar "${nombre}": ${err.error?.error || err.message}`);
      },
    });
  }

  deletePolitica(id: string, nombre: string): void {
    if (!confirm(`¿Eliminar la política "${nombre}"? Esta acción no se puede deshacer.`)) return;
    this.actionLoading['del_' + id] = true;
    this.politicaService.delete(id).subscribe({
      next: () => {
        this.actionLoading['del_' + id] = false;
        this.politicas = this.politicas.filter((p) => p.id !== id);
        this.showToast('success', `Política "${nombre}" eliminada correctamente.`);
      },
      error: (err) => {
        this.actionLoading['del_' + id] = false;
        this.showToast('error', `No se pudo eliminar "${nombre}": ${err.error?.error || err.message}`);
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
        this.updateKPIs();
      },
      error: (err) => {
        this.actionLoading['tr_' + tramiteId] = false;
        this.showToast('error', `No se pudo iniciar el trámite ${ref}: ${err.error?.error || err.message}`);
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
        this.showToast('error', `Error en análisis IA de "${nombre}": ${err.error?.error || err.message}`);
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
        this.showToast('error', `No se pudo marcar la notificación: ${err.error?.error || err.message}`);
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
        this.showToast('error', `Error al marcar notificaciones: ${err.error?.error || err.message}`);
      },
    });
  }

  toggleNotifPanel(): void {
    this.showNotifs = !this.showNotifs;
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

  verDiagrama(politica: Politica): void {
    this.politicaVisualizando = politica;
    this.showDiagramaModal = true;
  }

  cerrarDiagrama(): void {
    this.showDiagramaModal = false;
    this.politicaVisualizando = null;
  }

  getSwimlanes(nodos: Nodo[]): { dept: string; nodos: Nodo[] }[] {
    const map = new Map<string, Nodo[]>();
    const sinDept: Nodo[] = [];
    for (const n of nodos) {
      const dept = n.departamento || '';
      if (!dept) { sinDept.push(n); continue; }
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(n);
    }
    const result: { dept: string; nodos: Nodo[] }[] = [];
    if (sinDept.length > 0) result.push({ dept: 'Flujo General', nodos: sinDept });
    map.forEach((ns, dept) => result.push({ dept, nodos: ns }));
    return result;
  }

  getNombreNodo(nodos: Nodo[], id: string): string {
    return nodos.find(n => n.id === id)?.nombre || id;
  }

  showToast(type: 'success' | 'error' | 'info', message: string): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, 4000);
  }
}
