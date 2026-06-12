import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { Tarea, Notificacion } from '../../models/models';
import { TareaService } from '../../services/tarea/tarea.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { AuthService } from '../../services/auth/auth.service';
import { NotificacionService } from '../../services/notificacion/notificacion.service';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['../admin/admin.component.css', './dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: any;
  tareas: Tarea[] = [];
  notificaciones: Notificacion[] = [];
  showNotifs = false;
  loading = true;
  toast = '';
  toastType = 'success';

  private draggingTarea: Tarea | null = null;
  private wsSub!: Subscription;

  navItems: NavItem[] = [
    { icon: 'ph ph-kanban', label: 'Mis Tareas', route: '/dashboard' },
    { icon: 'ph ph-user', label: 'Mi Perfil', route: '/perfil' },
  ];

  get pendientes() { return this.tareas.filter(t => t.estado === 'PENDIENTE'); }
  get enProceso()  { return this.tareas.filter(t => t.estado === 'EN_PROCESO'); }
  get completadas(){ return this.tareas.filter(t => t.estado === 'COMPLETADO'); }

  constructor(
    private tareaService: TareaService,
    private authService: AuthService,
    private wsService: WebSocketService,
    private notifService: NotificacionService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.cargarTareas();
    this.cargarNotificaciones();
    this.conectarWebSocket();
  }

  cargarTareas(): void {
    if (!this.user?.id) { this.loading = false; return; }
    this.loading = true;
    const dept = this.user.departamento;
    if (dept) {
      this.tareaService.getByDepartamento(dept).pipe(
        catchError(err => {
          const msg = err.error?.error || err.message || 'Error desconocido';
          this.showToast('No se pudieron cargar las tareas: ' + msg, 'error');
          return of([]);
        })
      ).subscribe(t => {
        this.tareas = t;
        this.loading = false;
      });
    } else {
      this.tareaService.getByFuncionario(this.user.id).pipe(
        catchError(err => {
          const msg = err.error?.error || err.message || 'Error desconocido';
          this.showToast('No se pudieron cargar las tareas: ' + msg, 'error');
          return of([]);
        })
      ).subscribe(t => {
        this.tareas = t;
        this.loading = false;
      });
    }
  }

  cargarNotificaciones(): void {
    if (!this.user?.id) return;
    this.notifService.getNoLeidas(this.user.id).pipe(catchError(() => of([]))).subscribe(n => {
      this.notificaciones = n;
    });
  }

  conectarWebSocket(): void {
    if (!this.user?.id) return;
    this.wsService.conectar(this.user.id, this.user.rol, this.user.departamento);
    this.wsSub = this.wsService.notificaciones$.subscribe((n: any) => {
      if (n && (!n.usuarioId || n.usuarioId === this.user?.id)) {
        this.notificaciones.unshift(n);
        this.showToast(`Nueva Notificación: ${n.mensaje}`, 'info');
      }
      this.cargarTareas();
      // this.cargarNotificaciones(); (ya no hace falta recargar todas, acabamos de hacer unshift, o recargar si prefieres)
    });
  }

  // Drag & Drop
  onDragStart(event: DragEvent, tarea: Tarea): void {
    this.draggingTarea = tarea;
    event.dataTransfer?.setData('tareaId', tarea.id);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDrop(event: DragEvent, nuevoEstado: string): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    if (!this.draggingTarea) return;
    const tarea = this.draggingTarea;
    this.draggingTarea = null;

    // Only allow moving within own department
    if (tarea.departamento !== this.user?.departamento && this.user?.rol !== 'ADMIN') {
      this.showToast('Solo puedes mover tareas de tu departamento', 'error');
      return;
    }

    if (tarea.estado === nuevoEstado) return;

    if (nuevoEstado === 'COMPLETADO') {
      this.router.navigate(['/tarea', tarea.id]);
      return;
    }

    this.cambiarEstado(tarea, nuevoEstado);
  }

  cambiarEstado(tarea: Tarea, estado: string): void {
    this.tareaService.actualizarEstado(tarea.id, estado).pipe(
      catchError(err => {
        const msg = err.error?.error || err.message || 'Error desconocido';
        this.showToast('No se pudo cambiar el estado: ' + msg, 'error');
        return of(null);
      })
    ).subscribe(t => {
      if (t) {
        const idx = this.tareas.findIndex(x => x.id === tarea.id);
        if (idx >= 0) this.tareas[idx] = t;
        this.showToast(`Tarea movida a ${estado} correctamente`, 'success');
      }
    });
  }

  abrirTarea(tarea: Tarea): void {
    this.router.navigate(['/tarea', tarea.id]);
  }

  toggleNotifs(): void { this.showNotifs = !this.showNotifs; }

  marcarTodasLeidas(): void {
    if (!this.user?.id) return;
    this.notifService.marcarTodasLeidas(this.user.id).subscribe(() => {
      this.notificaciones = [];
    });
  }

  onNotifClick(n: Notificacion): void {
    this.notifService.marcarLeida(n.id).subscribe();
    this.notificaciones = this.notificaciones.filter(x => x.id !== n.id);
    this.showNotifs = false;
  }

  showToast(msg: string, type: string): void {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }

  ngOnDestroy(): void {
    if (this.wsSub) this.wsSub.unsubscribe();
    this.wsService.desconectar();
  }
}
