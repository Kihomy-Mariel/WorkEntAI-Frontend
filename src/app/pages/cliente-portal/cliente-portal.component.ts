import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of, Subscription } from 'rxjs';

import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth/auth.service';
import { PoliticaService } from '../../services/politica/politica.service';
import { TramiteService } from '../../services/tramite/tramite.service';
import { NotificacionService } from '../../services/notificacion/notificacion.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { Politica, Tramite, Notificacion } from '../../models/models';

@Component({
  selector: 'app-cliente-portal',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, SidebarComponent],
  templateUrl: './cliente-portal.component.html',
  styleUrls: ['../admin/admin.component.css', './cliente-portal.component.css']
})
export class ClientePortalComponent implements OnInit, OnDestroy {
  user: any;
  navItems: NavItem[] = [
    { icon: 'ph ph-folder-open', label: 'Trámites', route: '/cliente' },
    { icon: 'ph ph-user', label: 'Mi Perfil', route: '/perfil' }
  ];

  activeTab: 'disponibles' | 'mis-tramites' = 'disponibles';

  politicas: Politica[] = [];
  misTramites: Tramite[] = [];
  notificaciones: Notificacion[] = [];
  unreadCount = 0;

  loadingPoliticas = false;
  loadingTramites = false;
  showNotifPanel = false;

  // Modal
  showModal = false;
  politicaSeleccionada: Politica | null = null;
  modalDescripcion = '';
  modalError = '';
  enviando = false;

  // PDF download
  descargando: string | null = null;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  private wsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private politicaService: PoliticaService,
    private tramiteService: TramiteService,
    private notificacionService: NotificacionService,
    private wsService: WebSocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    
    // Check if we arrived from another page with a requested tab
    const state = history.state;
    if (state && state.activeTab) {
      this.activeTab = state.activeTab;
    }

    this.cargarPoliticas();
    this.cargarTramites();
    this.cargarNotificaciones();
    this.conectarWS();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsService.desconectar();
  }

  // ── Data loading ──────────────────────────────────────────────

  cargarPoliticas(): void {
    this.loadingPoliticas = true;
    this.politicaService.getActivas().pipe(
      catchError(err => {
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('No se pudieron cargar los trámites disponibles: ' + msg, 'error');
        this.loadingPoliticas = false;
        return of([]);
      })
    ).subscribe(data => {
      this.politicas = data;
      this.loadingPoliticas = false;
    });
  }

  cargarTramites(): void {
    if (!this.user?.id) return;
    this.loadingTramites = true;
    this.tramiteService.getByCliente(this.user.id).pipe(
      catchError(err => {
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('No se pudieron cargar tus trámites: ' + msg, 'error');
        this.loadingTramites = false;
        return of([]);
      })
    ).subscribe(data => {
      this.misTramites = data;
      this.loadingTramites = false;
    });
  }

  cargarNotificaciones(): void {
    if (!this.user?.id) return;
    this.notificacionService.getNoLeidas(this.user.id).pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      this.notificaciones = data;
      this.unreadCount = data.filter(n => !n.leida).length;
    });
  }

  // ── WebSocket ─────────────────────────────────────────────────

  conectarWS(): void {
    if (!this.user?.id) return;
    this.wsService.conectar(this.user.id, this.user.rol);
    this.wsSub = this.wsService.notificaciones$.subscribe(msg => {
      this.cargarTramites();
      this.cargarNotificaciones();
      this.showToast(msg.mensaje || 'Nueva notificación recibida', 'success');
    });
  }

  // ── Notifications ─────────────────────────────────────────────

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
  }

  marcarLeida(n: Notificacion): void {
    if (n.leida) return;
    this.notificacionService.marcarLeida(n.id).pipe(catchError(() => of(null))).subscribe(() => {
      n.leida = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
  }

  marcarTodasLeidas(): void {
    if (!this.user?.id) return;
    this.notificacionService.marcarTodasLeidas(this.user.id).pipe(catchError(() => of(null))).subscribe(() => {
      this.notificaciones.forEach(n => n.leida = true);
      this.unreadCount = 0;
    });
  }

  // ── Modal ─────────────────────────────────────────────────────

  abrirModal(politica: Politica): void {
    this.politicaSeleccionada = politica;
    this.modalDescripcion = '';
    this.modalError = '';
    this.enviando = false;
    this.showModal = true;
  }

  cerrarModal(): void {
    if (this.enviando) return;
    this.showModal = false;
    this.politicaSeleccionada = null;
  }

  confirmarSolicitud(): void {
    if (!this.politicaSeleccionada || !this.user?.id) return;
    this.enviando = true;
    this.modalError = '';
    this.tramiteService.iniciar(this.politicaSeleccionada.id, this.user.id, this.modalDescripcion).pipe(
      catchError(err => {
        this.modalError = err?.error?.error || 'Error al iniciar el trámite. Intenta de nuevo.';
        this.enviando = false;
        return of(null);
      })
    ).subscribe(tramite => {
      if (!tramite) return;
      this.enviando = false;
      this.showModal = false;
      this.politicaSeleccionada = null;
      this.showToast('Trámite iniciado correctamente', 'success');
      this.cargarTramites();
      this.activeTab = 'mis-tramites';
    });
  }

  // ── Tramite actions ───────────────────────────────────────────

  verDetalle(id: string): void {
    this.router.navigate(['/tramite', id]);
  }

  descargarPdf(tramite: Tramite): void {
    this.descargando = tramite.id;
    this.tramiteService.descargarPdf(tramite.id).pipe(
      catchError(() => {
        this.showToast('Error al descargar el PDF', 'error');
        this.descargando = null;
        return of(null);
      })
    ).subscribe(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tramite-${tramite.numeroReferencia || tramite.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.descargando = null;
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  irAgente(): void {
    this.router.navigate(['/agente']);
  }

  badgeTramite(estado: string): string {
    const map: Record<string, string> = {
      NUEVO: 'badge badge-nuevo',
      EN_PROCESO: 'badge badge-proceso',
      COMPLETADO: 'badge badge-completado',
      RECHAZADO: 'badge badge-rechazado'
    };
    return map[estado] || 'badge badge-rechazado';
  }

  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      NUEVO: 'Nuevo',
      EN_PROCESO: 'En Proceso',
      COMPLETADO: 'Completado',
      RECHAZADO: 'Rechazado'
    };
    return map[estado] || estado;
  }

  showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 4000);
  }
}
