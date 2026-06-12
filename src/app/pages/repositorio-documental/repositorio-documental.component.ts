import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DocumentoService, DocumentoTramite } from '../../services/documento/documento.service';
import { AuthService } from '../../services/auth/auth.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-repositorio-documental',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="repo-page">
      <!-- Modern Header -->
      <div class="page-header glass-panel">
        <div class="header-content">
          <div class="title-section">
            <span class="badge">Trámite #{{ tramiteId }}</span>
            <h1 class="page-title">Repositorio Documental</h1>
            <p class="page-sub">Gestiona y colabora en los documentos del trámite de manera centralizada.</p>
          </div>
          <div class="actions-section">
            <button class="btn btn-outline" routerLink="/admin/tramites">
              <span class="icon">⬅</span> Volver
            </button>
            <button class="btn btn-primary pulse-btn" [routerLink]="['/colaborar', tramiteId + '-notas']">
              <span class="icon">✨</span> Abrir Editor Colaborativo
            </button>
            <button class="btn btn-secondary" routerLink="./auditoria">
              <span class="icon">📋</span> Auditoría
            </button>
          </div>
        </div>
      </div>

      <div class="repo-content">
        <!-- Modern Upload Zone -->
        <div class="upload-zone" 
             [class.subiendo]="subiendo"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)"
             [class.drag-active]="isDragging">
          
          <div class="upload-icon-wrapper">
            <div class="upload-icon">☁️</div>
          </div>
          <h3>Subir Nuevo Documento</h3>
          <p>Arrastra tu archivo aquí o <span>haz clic para explorar</span></p>
          <input type="file" (change)="onArchivoSeleccionado($event)" [disabled]="subiendo" />
          
          @if (subiendo) {
            <div class="progress-container">
              <div class="spinner"></div>
              <span>Subiendo archivo de forma segura...</span>
            </div>
          }
        </div>

        <!-- Alerts -->
        <div class="alerts-container">
          @if (error) {
            <div class="alert error fade-in">
              <span class="icon">❌</span> {{ error }}
            </div>
          }
          @if (mensajeExito) {
            <div class="alert success fade-in">
              <span class="icon">✅</span> {{ mensajeExito }}
            </div>
          }
        </div>

        <!-- Document Grid -->
        <div class="doc-section">
          <div class="section-header">
            <h2>Archivos del Trámite</h2>
            <span class="doc-count">{{ documentos.length }} documentos</span>
          </div>

          @if (cargando) {
            <div class="loading-state">
              <div class="spinner large"></div>
              <p>Cargando repositorio...</p>
            </div>
          } @else {
            <div class="doc-grid">
              @for(doc of documentos; track doc.id) {
                <div class="doc-card fade-in">
                  <div class="doc-card-header">
                    <div class="doc-icon" [ngClass]="getIconClass(doc.tipoMime)">
                      {{ getIcon(doc.tipoMime) }}
                    </div>
                    <div class="doc-version">v{{ doc.version }}</div>
                  </div>
                  
                  <div class="doc-info">
                    <h3 class="doc-name" [title]="doc.nombre">{{ doc.nombre }}</h3>
                    <div class="doc-meta-grid">
                      <div class="meta-item">
                        <span class="label">Tamaño</span>
                        <span class="value">{{ formatearTamano(doc.tamanoBytes) }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="label">Subido por</span>
                        <span class="value author">{{ doc.subidoPorNombre }}</span>
                      </div>
                      <div class="meta-item full-width">
                        <span class="label">Fecha</span>
                        <span class="value">{{ doc.fechaSubida | date:'medium' }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="doc-actions-overlay">
                    <button class="action-btn view-btn" (click)="previsualizar(doc)" title="Vista Previa">
                      👁️
                    </button>
                    <button class="action-btn download-btn" (click)="descargar(doc)" title="Descargar">
                      ⬇️
                    </button>
                    <button class="action-btn delete-btn" (click)="eliminar(doc)" title="Eliminar">
                      🗑️
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-state full-width">
                  <div class="empty-illustration">📂</div>
                  <h3>El repositorio está vacío</h3>
                  <p>Comienza arrastrando un documento a la zona de carga superior.</p>
                </div>
              }
            </div>
          }
        </div>
      </div>
      
      <!-- Modern Preview Modal -->
      @if (previewUrl) {
        <div class="modal-overlay" (click)="cerrarPreview()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">
                <span class="icon">👁️</span>
                <h3>Vista Previa del Documento</h3>
              </div>
              <button class="btn-close-modal" (click)="cerrarPreview()">✖</button>
            </div>
            <div class="modal-body">
              @if (previewLoading) {
                <div class="modal-loading">
                  <div class="spinner large"></div>
                  <p>Cargando vista previa segura...</p>
                </div>
              }
              @if (previewIsImage && !previewLoading) {
                <img [src]="previewUrl" alt="Vista Previa" class="preview-media image-preview" />
              } @else if (!previewIsImage && !previewLoading) {
                <iframe [src]="previewUrl" class="preview-media" title="Vista Previa" frameborder="0"></iframe>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; font-family: 'Inter', system-ui, sans-serif; background-color: #f4f7fb; min-height: 100vh; }
    
    /* Layout & Utilities */
    .repo-page { padding: 32px 48px; max-width: 1400px; margin: 0 auto; }
    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    /* Header (Glassmorphism) */
    .glass-panel {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.03);
      margin-bottom: 32px;
    }
    .header-content { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 24px; }
    
    .badge { display: inline-block; padding: 6px 14px; background: #e0e7ff; color: #4338ca; border-radius: 20px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; }
    .page-title { font-size: 36px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -1px; line-height: 1.1; }
    .page-sub { color: #64748b; font-size: 16px; margin: 0; max-width: 500px; }
    
    .actions-section { display: flex; gap: 16px; align-items: center; }
    .btn { padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: none; font-size: 15px; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
    
    .btn-primary { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: white; box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(79, 70, 229, 0.4); }
    .pulse-btn { position: relative; }
    .pulse-btn::after { content: ''; position: absolute; inset: -4px; border-radius: 16px; border: 2px solid #4f46e5; opacity: 0; animation: borderPulse 2s infinite; }
    @keyframes borderPulse { 0% { transform: scale(0.95); opacity: 0.5; } 100% { transform: scale(1.05); opacity: 0; } }
    
    .btn-secondary { background: white; color: #334155; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
    .btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .btn-outline { background: transparent; border: 1px solid transparent; color: #64748b; }
    .btn-outline:hover { background: rgba(100,116,139,0.05); color: #0f172a; }

    /* Upload Zone */
    .upload-zone {
      background: white; border: 2px dashed #cbd5e1; border-radius: 20px; padding: 48px; text-align: center; position: relative; margin-bottom: 32px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      overflow: hidden;
    }
    .upload-zone:hover, .drag-active { border-color: #4f46e5; background: #f8faff; transform: translateY(-2px); box-shadow: 0 12px 24px rgba(79, 70, 229, 0.08); }
    .upload-zone input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 10; }
    
    .upload-icon-wrapper { width: 80px; height: 80px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; transition: all 0.3s; }
    .upload-zone:hover .upload-icon-wrapper { background: #e0e7ff; transform: scale(1.1); }
    .upload-icon { font-size: 40px; }
    
    .upload-zone h3 { margin: 0 0 12px 0; color: #1e293b; font-size: 20px; font-weight: 700; }
    .upload-zone p { margin: 0; color: #64748b; font-size: 15px; }
    .upload-zone p span { color: #4f46e5; font-weight: 600; text-decoration: underline; }
    
    .subiendo { opacity: 0.8; pointer-events: none; }
    .progress-container { margin-top: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: #4f46e5; font-weight: 600; }
    
    /* Spinners */
    .spinner { border: 3px solid rgba(79, 70, 229, 0.2); border-left-color: #4f46e5; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
    .spinner.large { width: 40px; height: 40px; border-width: 4px; margin-bottom: 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Alerts */
    .alerts-container { margin-bottom: 24px; }
    .alert { padding: 16px 20px; border-radius: 12px; font-size: 15px; font-weight: 500; display: flex; align-items: center; gap: 12px; }
    .error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.05); }
    .success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.05); }

    /* Grid Section */
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .section-header h2 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
    .doc-count { background: #e2e8f0; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
    
    .doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    
    /* Document Cards */
    .doc-card { 
      background: white; border-radius: 16px; padding: 24px; position: relative; overflow: hidden;
      border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .doc-card:hover { transform: translateY(-6px); box-shadow: 0 16px 32px rgba(0,0,0,0.06); border-color: #cbd5e1; }
    
    .doc-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .doc-icon { font-size: 36px; width: 64px; height: 64px; background: #f8fafc; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
    .icon-pdf { background: #fef2f2; color: #ef4444; }
    .icon-img { background: #eff6ff; color: #3b82f6; }
    .icon-doc { background: #e0e7ff; color: #4f46e5; }
    .icon-xls { background: #f0fdf4; color: #22c55e; }
    .doc-version { background: #f1f5f9; color: #64748b; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
    
    .doc-info { margin-bottom: 12px; }
    .doc-name { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .doc-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .meta-item { display: flex; flex-direction: column; gap: 4px; }
    .full-width { grid-column: 1 / -1; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 600; }
    .value { font-size: 14px; color: #334155; font-weight: 500; }
    .value.author { color: #4f46e5; }

    /* Card Actions Overlay */
    .doc-actions-overlay {
      position: absolute; inset: 0; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; gap: 16px;
      opacity: 0; visibility: hidden; transition: all 0.3s ease;
    }
    .doc-card:hover .doc-actions-overlay { opacity: 1; visibility: visible; }
    
    .action-btn { 
      width: 48px; height: 48px; border-radius: 50%; border: none; font-size: 20px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .view-btn { background: white; color: #3b82f6; }
    .view-btn:hover { background: #3b82f6; color: white; transform: scale(1.1); }
    .download-btn { background: white; color: #10b981; }
    .download-btn:hover { background: #10b981; color: white; transform: scale(1.1); }
    .delete-btn { background: white; color: #ef4444; }
    .delete-btn:hover { background: #ef4444; color: white; transform: scale(1.1); }

    /* Empty & Loading States */
    .loading-state, .empty-state { text-align: center; padding: 64px 24px; background: white; border-radius: 20px; border: 1px dashed #cbd5e1; }
    .empty-illustration { font-size: 64px; margin-bottom: 24px; opacity: 0.5; }
    .empty-state h3 { color: #1e293b; font-size: 20px; margin: 0 0 8px 0; }
    .empty-state p { color: #64748b; margin: 0; }

    /* Modern Preview Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 32px; }
    .modal-content { background: white; border-radius: 24px; width: 100%; max-width: 1100px; height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 32px; border-bottom: 1px solid #f1f5f9; background: white; }
    .modal-title { display: flex; align-items: center; gap: 12px; }
    .modal-title h3 { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }
    
    .btn-close-modal { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 16px; color: #64748b; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
    .btn-close-modal:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
    
    .modal-body { flex: 1; padding: 0; background: #e2e8f0; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .modal-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; color: #475569; font-weight: 500; }
    
    .preview-media { width: 100%; height: 100%; border: none; }
    .image-preview { object-fit: contain; padding: 32px; box-sizing: border-box; }
    
    @keyframes modalIn { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `]
})
export class RepositorioDocumentalComponent implements OnInit {
  tramiteId = '';
  documentos: DocumentoTramite[] = [];
  cargando = false;
  subiendo = false;
  error = '';
  mensajeExito = '';
  esAdmin = false;
  
  isDragging = false;
  
  previewUrl: any = null;
  previewIsImage = false;
  previewLoading = false;

  private route = inject(ActivatedRoute);
  private documentoService = inject(DocumentoService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  ngOnInit() {
    this.tramiteId = this.route.snapshot.paramMap.get('id') || '';
    this.esAdmin = this.authService.getRol() === 'ADMIN';
    if (this.tramiteId) {
      this.cargarDocumentos();
    }
  }

  cargarDocumentos() {
    this.cargando = true;
    this.documentoService.listarDocumentos(this.tramiteId).subscribe({
      next: (docs) => { this.documentos = docs; this.cargando = false; },
      error: () => { this.error = 'Error al cargar el repositorio'; this.cargando = false; }
    });
  }

  // --- Drag and Drop Handlers ---
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.subirArchivo(files[0]);
    }
  }

  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.subirArchivo(input.files[0]);
    input.value = '';
  }

  getIcon(mime: string): string {
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('image')) return '🖼️';
    if (mime.includes('word') || mime.includes('document')) return '📝';
    if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
    if (mime.includes('video')) return '🎥';
    return '📁';
  }

  getIconClass(mime: string): string {
    if (mime.includes('pdf')) return 'icon-pdf';
    if (mime.includes('image')) return 'icon-img';
    if (mime.includes('word') || mime.includes('document')) return 'icon-doc';
    if (mime.includes('excel') || mime.includes('spreadsheet')) return 'icon-xls';
    return '';
  }

  subirArchivo(archivo: File) {
    this.subiendo = true;
    this.error = '';
    this.documentoService.subirDocumento(this.tramiteId, archivo).subscribe({
      next: (doc) => {
        this.documentos.unshift(doc);
        this.subiendo = false;
        this.mostrarExito('Documento subido correctamente');
      },
      error: (err) => {
        this.subiendo = false;
        this.error = err.error?.message || 'Error al subir el archivo.';
        setTimeout(() => this.error = '', 5000);
      }
    });
  }

  descargar(doc: DocumentoTramite) {
    this.documentoService.obtenerUrlDescarga(doc.id).subscribe({
      next: ({url}) => window.open(url, '_blank'),
      error: () => {
        this.error = 'No tienes permiso para descargar este documento.';
        setTimeout(() => this.error = '', 4000);
      }
    });
  }

  previsualizar(doc: DocumentoTramite) {
    this.previewIsImage = doc.tipoMime.startsWith('image/');
    this.previewLoading = true;
    
    this.documentoService.obtenerUrlDescarga(doc.id).subscribe({
      next: ({url}) => {
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.previewLoading = false;
      },
      error: () => {
        this.error = 'No tienes permiso para previsualizar este documento.';
        setTimeout(() => this.error = '', 4000);
        this.previewLoading = false;
        this.previewUrl = null;
      }
    });
  }

  cerrarPreview() {
    this.previewUrl = null;
  }

  eliminar(doc: DocumentoTramite) {
    if (!confirm(`¿Eliminar versión ${doc.version} de ${doc.nombre}?`)) return;
    this.documentoService.eliminarDocumento(doc.id).subscribe({
      next: () => {
        this.documentos = this.documentos.filter(d => d.id !== doc.id);
        this.mostrarExito('Documento eliminado correctamente.');
      },
      error: () => this.error = 'Error al eliminar el documento.'
    });
  }

  private mostrarExito(msg: string) {
    this.mensajeExito = msg;
    setTimeout(() => this.mensajeExito = '', 4000);
  }

  formatearTamano(bytes: number) { return this.documentoService.formatearTamano(bytes); }
}

