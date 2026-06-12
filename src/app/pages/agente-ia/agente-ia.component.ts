import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgenteService, AgenteSession } from '../../services/agente/agente.service';
import { DocumentoService } from '../../services/documento/documento.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-agente-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agente-ia.component.html',
  styleUrls: ['./agente-ia.component.css']
})
export class AgenteIaComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('mensajesContainer') private mensajesContainer!: ElementRef;

  sesion: AgenteSession | null = null;
  mensajeInput = '';
  cargando = false;
  error = '';
  enviando = false;
  private shouldScrollDown = false;
  
  isRecording = false;
  fileAttached: File | null = null;
  archivosPendientes: File[] = [];
  sidebarHidden = false;

  // Texto de bienvenida inicial
  readonly mensajeBienvenida = `¡Hola! 👋 Soy **WorkBot**, tu asistente virtual.\n\nPara ayudarte, cuéntame brevemente:\n**¿Qué tipo de trámite necesitas realizar?**`;

  constructor(
    private agenteService: AgenteService,
    private documentoService: DocumentoService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.iniciarSesion();
  }

  ngOnDestroy(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScrollDown) {
      this.scrollToBottom();
      this.shouldScrollDown = false;
    }
  }

  iniciarSesion(): void {
    this.cargando = true;
    this.agenteService.iniciarSesion().subscribe({
      next: (sesion) => {
        this.sesion = sesion;
        this.cargando = false;
        this.shouldScrollDown = true;
      },
      error: (err) => {
        this.error = 'Error al conectar con el asistente. Por favor recarga la página.';
        this.cargando = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) this.fileAttached = file;
  }

  toggleVoice(): void {
    this.isRecording = !this.isRecording;
    if (this.isRecording) {
      this.mensajeInput = 'Escuchando...';
      setTimeout(() => {
        this.isRecording = false;
        this.mensajeInput = 'Me gustaría realizar un trámite de actualización de datos'; 
      }, 3000);
    } else {
      this.mensajeInput = '';
    }
  }

  enviarMensaje(): void {
    const texto = this.mensajeInput.trim() + (this.fileAttached ? `\n[Archivo adjunto: ${this.fileAttached.name}]` : '');
    if (!texto || !this.sesion || this.enviando) return;

    if (this.fileAttached) {
      this.archivosPendientes.push(this.fileAttached);
    }
    this.mensajeInput = '';
    this.fileAttached = null;
    this.enviando = true;

    this.agenteService.enviarMensaje(this.sesion.id, texto).subscribe({
      next: (sesionActualizada) => {
        this.sesion = sesionActualizada;
        this.enviando = false;
        this.shouldScrollDown = true;

        if (sesionActualizada.fase === 'COMPLETADA' && sesionActualizada.tramiteId) {
          // Subir los archivos acumulados al repositorio documental
          this.archivosPendientes.forEach(archivo => {
            this.documentoService.subirDocumento(sesionActualizada.tramiteId!, archivo, undefined, `Subido por IA: ${archivo.name}`).subscribe({
              next: () => console.log('Documento subido con éxito:', archivo.name),
              error: (err) => console.error('Error al subir documento:', archivo.name, err)
            });
          });
          this.archivosPendientes = []; // Limpiar
          setTimeout(() => this.shouldScrollDown = true, 100);
        }
      },
      error: (err) => {
        this.enviando = false;
        this.error = 'Error al procesar tu mensaje. Intenta de nuevo.';
        setTimeout(() => this.error = '', 4000);
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  irAMisTramites(): void {
    const user = this.authService.getUser();
    if (user?.rol === 'ADMIN') {
      this.router.navigate(['/admin/tramites']);
    } else if (user?.rol === 'FUNCIONARIO') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/cliente'], { state: { activeTab: 'mis-tramites' } });
    }
  }

  confirmarTramite(): void {
    this.mensajeInput = 'Sí, iniciar trámite';
    this.enviarMensaje();
  }

  nuevaSesion(): void {
    this.sesion = null;
    this.error = '';
    this.iniciarSesion();
  }

  toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
  }

  get todosLosMensajes(): Array<{ rol: string; contenido: string; timestamp: string }> {
    const bienvenida = [{ rol: 'AGENTE', contenido: this.mensajeBienvenida, timestamp: this.sesion?.fechaCreacion || new Date().toISOString() }];
    return [...bienvenida, ...(this.sesion?.mensajes || [])];
  }

  formatearContenido(contenido: string): string {
    return contenido
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  formatearHora(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  get estaCompleta(): boolean { return this.sesion?.fase === 'COMPLETADA'; }
  get tieneError(): boolean { return !!this.error; }

  private scrollToBottom(): void {
    try {
      const el = this.mensajesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  faseLegible(fase: string): string {
    return { IDENTIFICACION: 'Identificando trámite', REQUISITOS: 'Verificando requisitos', CONFIRMACION: 'Confirmación', COMPLETADA: 'Completado', ABANDONADA: 'Cancelado' }[fase] || fase;
  }
  
  getBadgeClass(fase: string): string {
    return { IDENTIFICACION: 'badge-proceso', REQUISITOS: 'badge-warning', CONFIRMACION: 'badge-activa', COMPLETADA: 'badge-completado', ABANDONADA: 'badge-rechazado' }[fase] || 'badge-inactiva';
  }
}
