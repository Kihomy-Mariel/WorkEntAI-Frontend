import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Client, Message } from '@stomp/stompjs';
import { AuthService } from '../../../services/auth/auth.service';
import { DocumentoService, DocumentoTramite } from '../../../services/documento/documento.service';
import { DomSanitizer } from '@angular/platform-browser';
import { fabric } from 'fabric'; 
import * as pdfjsLib from 'pdfjs-dist';

@Component({
  selector: 'app-editor-colaborativo',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="collab-layout">
      <!-- Modern Navbar -->
      <div class="collab-header glass-panel">
        <div class="header-left">
          <button class="btn-back" routerLink="../../">
            <span class="icon">⬅</span> Volver
          </button>
          <div class="header-titles">
            <h1>Editor Colaborativo</h1>
            <span class="badge-notas">Sesión: {{ docId }}</span>
          </div>
        </div>
        
        <!-- Document Selector -->
        <div class="header-center">
          <select class="modern-select" (change)="seleccionarDocumento($event)">
            <option value="">Selecciona un documento para anotar...</option>
            @for(doc of documentos; track doc.id) {
              <option [value]="doc.id">{{ doc.nombre }} (v{{ doc.version }})</option>
            }
          </select>
        </div>

        <div class="header-right">
          <div class="sync-status" [class.synced]="!isSyncing" [class.syncing]="isSyncing">
            {{ isSyncing ? 'Guardando...' : 'Sincronizado' }}
          </div>
          <div class="users-badge" [title]="'Colaborando: ' + activeUsersNames">
            <span class="pulse"></span>
            {{ activeUsersCount }} Online
            <span class="users-list-tooltip">Colaborando: {{ activeUsersNames || 'Solo tú' }}</span>
          </div>
        </div>
      </div>

      <!-- Main Canvas Area -->
      <div class="workspace-container">
        <!-- Floating Toolbar -->
        <div class="floating-toolbar" *ngIf="currentDocId">
          <div class="tool-group">
            <button class="tool-btn" [class.active]="currentMode === 'select'" (click)="setMode('select')" title="Seleccionar/Mover">
              👆
            </button>
            <button class="tool-btn" [class.active]="currentMode === 'draw'" (click)="setMode('draw')" title="Lápiz / Dibujar">
              ✏️
            </button>
            <button class="tool-btn" [class.active]="currentMode === 'text'" (click)="setMode('text')" title="Añadir Texto">
              T
            </button>
          </div>
          
          <div class="tool-divider" *ngIf="currentMode === 'draw' || currentMode === 'text'"></div>
          
          <!-- Color Picker -->
          <div class="tool-group" *ngIf="currentMode === 'draw' || currentMode === 'text'">
            <button class="color-btn" style="background: #ef4444;" (click)="setColor('#ef4444')" [class.active-color]="brushColor === '#ef4444'"></button>
            <button class="color-btn" style="background: #3b82f6;" (click)="setColor('#3b82f6')" [class.active-color]="brushColor === '#3b82f6'"></button>
            <button class="color-btn" style="background: #10b981;" (click)="setColor('#10b981')" [class.active-color]="brushColor === '#10b981'"></button>
            <button class="color-btn" style="background: #f59e0b;" (click)="setColor('#f59e0b')" [class.active-color]="brushColor === '#f59e0b'"></button>
            <button class="color-btn" style="background: #1e293b;" (click)="setColor('#1e293b')" [class.active-color]="brushColor === '#1e293b'"></button>
          </div>
          
          <div class="tool-divider"></div>
          
          <div class="tool-group">
            <button class="tool-btn danger" (click)="clearCanvas()" title="Borrar todo">
              🗑️
            </button>
          </div>
        </div>

        <!-- Canvas Container -->
        <div class="canvas-wrapper" #canvasWrapper>
          @if (previewLoading) {
            <div class="loading-overlay">
              <div class="spinner"></div>
              <p>Preparando lienzo colaborativo...</p>
            </div>
          } @else if (!currentDocId) {
            <div class="empty-state">
              <div class="empty-icon">📄</div>
              <h2>Lienzo Vacío</h2>
              <p>Selecciona un documento de la barra superior para comenzar a dibujar y anotar colaborativamente.</p>
            </div>
          }
          
          <!-- Background Document Image -->
          <img #bgImage [style.display]="bgImageUrl ? 'block' : 'none'" [src]="bgImageUrl" class="bg-document" (load)="onImageLoad()" crossorigin="anonymous"/>
          
          <!-- Fabric JS Canvas overlay -->
          <canvas #fabricCanvas id="fabricCanvas"></canvas>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .collab-layout { display: flex; flex-direction: column; height: 100vh; background: #e2e8f0; font-family: 'Inter', sans-serif; overflow: hidden; }
    
    /* Header */
    .collab-header { 
      display: flex; justify-content: space-between; align-items: center; 
      padding: 16px 24px; background: rgba(255, 255, 255, 0.95); 
      backdrop-filter: blur(10px); border-bottom: 1px solid #cbd5e1; z-index: 50; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    
    .header-left, .header-right { display: flex; align-items: center; gap: 16px; min-width: 250px; }
    .header-right { justify-content: flex-end; }
    .header-center { flex: 1; display: flex; justify-content: center; }
    
    .btn-back { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; color: #475569; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; }
    .btn-back:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }
    
    .header-titles h1 { margin: 0; font-size: 20px; font-weight: 800; color: #1e293b; }
    .badge-notas { font-size: 12px; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; display: inline-block; margin-top: 4px; }
    
    .modern-select { 
      width: 100%; max-width: 400px; padding: 10px 16px; border-radius: 10px; border: 2px solid #cbd5e1; 
      outline: none; font-size: 14px; font-weight: 500; color: #1e293b; background: white; transition: all 0.2s; 
    }
    .modern-select:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
    
    .sync-status { font-size: 13px; font-weight: 600; color: #64748b; transition: color 0.3s; }
    .sync-status.syncing { color: #f59e0b; }
    
    .users-badge { position: relative; display: flex; align-items: center; gap: 8px; background: #f0fdf4; color: #15803d; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 1px solid #bbf7d0; cursor: help; }
    .users-list-tooltip { visibility: hidden; position: absolute; top: 120%; right: 0; background: #1e293b; color: white; padding: 8px 12px; border-radius: 8px; font-size: 12px; white-space: nowrap; z-index: 100; opacity: 0; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .users-badge:hover .users-list-tooltip { visibility: visible; opacity: 1; top: 110%; }
    .pulse { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }

    /* Workspace */
    .workspace-container { flex: 1; position: relative; display: flex; justify-content: center; overflow: auto; padding: 32px; }
    
    /* Toolbar */
    .floating-toolbar {
      position: fixed; left: 32px; top: 120px; background: white; border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;
      padding: 12px; display: flex; flex-direction: column; gap: 12px; z-index: 100;
    }
    
    .tool-group { display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .tool-divider { width: 100%; height: 1px; background: #e2e8f0; }
    
    .tool-btn { 
      width: 40px; height: 40px; border-radius: 10px; border: none; background: transparent; 
      font-size: 18px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
    }
    .tool-btn:hover { background: #f1f5f9; }
    .tool-btn.active { background: #e0e7ff; color: #4f46e5; box-shadow: inset 0 0 0 2px #4f46e5; }
    .tool-btn.danger:hover { background: #fef2f2; color: #ef4444; }
    
    .color-btn { width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s; }
    .color-btn:hover { transform: scale(1.1); }
    .color-btn.active-color { box-shadow: 0 0 0 2px white, 0 0 0 4px #4f46e5; }

    /* Canvas Area */
    .canvas-wrapper {
      position: relative; background: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); 
      border-radius: 8px; margin: 0 auto;
    }
    
    .bg-document { display: none; }
    
    .canvas-container { margin: 0 auto; border-radius: 8px; overflow: hidden; }

    .loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; }
    .spinner { border: 4px solid rgba(79, 70, 229, 0.2); border-left-color: #4f46e5; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    .empty-state { padding: 100px; text-align: center; color: #64748b; }
    .empty-icon { font-size: 64px; margin-bottom: 24px; opacity: 0.5; }
    .empty-state h2 { color: #1e293b; margin: 0 0 12px 0; }
  `]
})
export class EditorColaborativoComponent implements OnInit, OnDestroy, AfterViewInit {
  docId = '';
  tramiteId = '';
  activeUsersCount = 1;
  activeUsersNames = '';
  userId = '';
  userName = '';
  
  documentos: DocumentoTramite[] = [];
  currentDocId = '';
  
  // Canvas State
  currentMode: 'select' | 'draw' | 'text' = 'select';
  brushColor = '#ef4444';
  bgImageUrl: string | null = null;
  previewLoading = false;
  isSyncing = false;
  
  @ViewChild('fabricCanvas') fabricCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrapper') canvasWrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('bgImage') bgImageRef!: ElementRef<HTMLImageElement>;
  
  private canvas!: fabric.Canvas;
  private stompClient!: Client;
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private documentoService = inject(DocumentoService);
  private sanitizer = inject(DomSanitizer);
  
  // Prevent echo loop
  private isApplyingRemoteChange = false;
  private syncTimeout: any;

  ngOnInit() {
    this.docId = this.route.snapshot.paramMap.get('docId') || 'doc-1';
    this.tramiteId = this.docId.replace('-notas', '');
    const user = this.authService.getUser() as any;
    this.userId = user?.id || `anon-${Math.floor(Math.random() * 1000)}`;
    this.userName = user?.nombre || 'Usuario Anónimo';
    
    // Configurar Worker de PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    this.cargarDocumentos();
    this.conectarWebSocket();
  }

  ngAfterViewInit() {
    this.initFabricCanvas();
  }

  private initFabricCanvas() {
    this.canvas = new fabric.Canvas(this.fabricCanvasRef.nativeElement, {
      isDrawingMode: false,
      width: 800,
      height: 600,
      selection: true,
      preserveObjectStacking: true
    });

    // Configurar pincel por defecto
    const brush = new fabric.PencilBrush(this.canvas);
    brush.color = this.brushColor;
    brush.width = 3;
    this.canvas.freeDrawingBrush = brush;

    // Escuchar eventos locales para emitir a WS
    this.canvas.on('path:created', () => this.broadcastState());
    this.canvas.on('object:modified', () => this.broadcastState());
    this.canvas.on('object:removed', () => this.broadcastState());
    
    // Para click en modo texto
    this.canvas.on('mouse:down', (options: any) => {
      if (this.currentMode === 'text' && !options.target) {
        const pointer = this.canvas.getPointer(options.e);
        const text = new fabric.IText('Añadir texto...', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Inter',
          fill: this.brushColor,
          fontSize: 20
        });
        this.canvas.add(text);
        this.canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        this.setMode('select'); // volver a modo seleccion
        this.broadcastState();
      }
    });
  }

  cargarDocumentos() {
    if (this.tramiteId) {
      this.documentoService.listarDocumentos(this.tramiteId).subscribe({
        next: (docs) => this.documentos = docs,
        error: (err) => console.error('Error cargando documentos', err)
      });
    }
  }

  seleccionarDocumento(event: any) {
    const selectedId = event.target.value;
    if (!selectedId) {
      this.currentDocId = '';
      this.bgImageUrl = null;
      this.canvas.clear();
      return;
    }

    const doc = this.documentos.find(d => d.id === selectedId);
    if (!doc) return;

    this.currentDocId = doc.id;
    this.previewLoading = true;
    
    this.documentoService.obtenerUrlDescarga(doc.id).subscribe({
      next: async ({url}) => {
        if (doc.tipoMime === 'application/pdf') {
          await this.renderPdfToCanvas(url);
        } else if (doc.tipoMime.startsWith('image/')) {
          this.bgImageUrl = url; // Renderizado vía onImageLoad()
        } else {
          alert('Actualmente sólo se soportan PDF e Imágenes para anotaciones superpuestas.');
          this.previewLoading = false;
        }
      },
      error: () => {
        alert('Error al obtener el documento.');
        this.previewLoading = false;
      }
    });
  }

  // Cargar imagen nativa como fondo del Canvas
  onImageLoad() {
    if (!this.bgImageRef || !this.bgImageUrl) return;
    const imgEl = this.bgImageRef.nativeElement;
    
    const scale = Math.min(1000 / imgEl.naturalWidth, 1);
    const canvasWidth = imgEl.naturalWidth * scale;
    const canvasHeight = imgEl.naturalHeight * scale;
    
    this.canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    
    fabric.Image.fromURL(imgEl.src, (img: any) => {
      if (!img) {
        console.error('Error cargando fondo en fabric');
        this.previewLoading = false;
        return;
      }
      img.scale(scale);
      this.canvas.backgroundImage = img;
      this.canvas.renderAll();
      this.previewLoading = false;
      this.broadcastState(); // Sync background change
    }, { crossOrigin: 'anonymous' });
  }

  // Renderizar la primera página de un PDF a una imagen base64 y usarla como fondo
  async renderPdfToCanvas(pdfUrl: string) {
    try {
      const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1); // Para demo: solo primera página
      
      const viewport = page.getViewport({ scale: 1.5 });
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;
      
      await page.render({
        canvasContext: context!,
        viewport: viewport
      } as any).promise;
      
      const dataUrl = tempCanvas.toDataURL('image/png');
      this.bgImageUrl = dataUrl; // Esto disparará onImageLoad que pondrá el fondo en Fabric
      
    } catch (error) {
      console.error('Error renderizando PDF:', error);
      this.previewLoading = false;
    }
  }

  // Herramientas del Toolbar
  setMode(mode: 'select' | 'draw' | 'text') {
    this.currentMode = mode;
    if (mode === 'draw') {
      this.canvas.isDrawingMode = true;
    } else {
      this.canvas.isDrawingMode = false;
    }
  }

  setColor(color: string) {
    this.brushColor = color;
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = color;
    }
    // Cambiar color de objeto seleccionado
    const activeObj = this.canvas.getActiveObject();
    if (activeObj) {
      if (activeObj.type === 'i-text' || activeObj.type === 'text') {
        activeObj.set('fill', color);
      } else if (activeObj.type === 'path') {
        activeObj.set('stroke', color);
      }
      this.canvas.renderAll();
      this.broadcastState();
    }
  }

  clearCanvas() {
    if(confirm('¿Borrar todas las anotaciones?')) {
      const bg = this.canvas.backgroundImage;
      this.canvas.clear();
      if (bg) this.canvas.backgroundImage = bg;
      this.canvas.renderAll();
      this.broadcastState();
    }
  }

  // --- WebSocket Collab Logic ---

  private conectarWebSocket() {
    // Usar la URL base actual o entorno local
    this.stompClient = new Client({
      brokerURL: `ws://${window.location.hostname}:8080/ws`,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = () => {
      console.log('STOMP connected to canvas collab');
      
      this.stompClient.subscribe(`/topic/collab/${this.docId}`, (msg: Message) => {
        const data = JSON.parse(msg.body);
        
        if (data.type === 'STATE') {
          // data.userId contiene los nombres concatenados por comas desde el backend
          this.activeUsersNames = data.userId || '';
          this.activeUsersCount = this.activeUsersNames ? this.activeUsersNames.split(',').length : 0;
          
          if (data.content && data.userId !== this.userId) {
            this.applyRemoteState(data.content);
          }
        } else if (data.type === 'CANVAS_UPDATE' && data.userId !== this.userId) {
          this.applyRemoteState(data.content);
        }
      });

      this.stompClient.publish({
        destination: `/app/collab/${this.docId}`,
        body: JSON.stringify({ type: 'JOIN', userId: this.userId, userName: this.userName })
      });
    };

    this.stompClient.activate();
  }

  private broadcastState() {
    if (this.isApplyingRemoteChange) return; // evitar bucle infinito
    
    this.isSyncing = true;
    clearTimeout(this.syncTimeout);
    
    // Debounce para evitar saturar el WS
    this.syncTimeout = setTimeout(() => {
      if (this.stompClient && this.stompClient.active) {
        const jsonState = JSON.stringify(this.canvas.toJSON(['width', 'height']));
        this.stompClient.publish({
          destination: `/app/collab/${this.docId}`,
          body: JSON.stringify({
            type: 'CANVAS_UPDATE',
            userId: this.userId,
            content: jsonState
          })
        });
      }
      this.isSyncing = false;
    }, 300);
  }

  private applyRemoteState(jsonState: string) {
    if (!jsonState || jsonState === '{}') return;
    
    this.isApplyingRemoteChange = true;
    try {
      this.canvas.loadFromJSON(jsonState, () => {
        this.canvas.renderAll();
        this.isApplyingRemoteChange = false;
      });
    } catch (e) {
      console.error("Error aplicando estado remoto", e);
      this.isApplyingRemoteChange = false;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Permitir borrar objetos con Delete o Backspace (si no estamos escribiendo texto)
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.currentMode === 'select') {
      const activeObj = this.canvas.getActiveObject();
      if (activeObj && !(activeObj as any).isEditing) {
        this.canvas.remove(activeObj);
        this.canvas.discardActiveObject();
        this.broadcastState();
      }
    }
  }

  ngOnDestroy() {
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.publish({
        destination: `/app/collab/${this.docId}`,
        body: JSON.stringify({ type: 'LEAVE', userId: this.userId })
      });
      this.stompClient.deactivate();
    }
    if (this.canvas) {
      this.canvas.dispose();
    }
  }
}
