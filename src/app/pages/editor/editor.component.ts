declare const go: any;

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PoliticaService } from '../../services/politica/politica.service';
import { AIService } from '../../services/ai/ai.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { AuthService } from '../../services/auth/auth.service';
import { Politica, Nodo, CampoFormulario } from '../../models/models';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface NodeData {
  key: number;
  text: string;
  category: string;
  departamento?: string;
  descripcion?: string;
  tiempoLimiteHoras?: number;
  camposFormulario?: CampoFormulario[];
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="editor-root">

  <!-- TOOLBAR -->
  <div class="toolbar">
    <button class="btn-icon" (click)="goBack()" title="Volver">
      <span>&#8592;</span>
    </button>
    <input class="toolbar-input" [(ngModel)]="politicaNombre" placeholder="Nombre de la política" />
    <input class="toolbar-input sm" [(ngModel)]="politicaCategoria" placeholder="Categoría" />
    <span class="badge">{{ nodeCount }} nodos · {{ linkCount }} enlaces</span>
    <div class="spacer"></div>
    <button class="btn-icon" (click)="zoomIn()" title="Acercar">+</button>
    <button class="btn-icon" (click)="zoomOut()" title="Alejar">−</button>
    <button class="btn-secondary" (click)="save()">Guardar</button>
    <button class="btn-primary" (click)="activate()">Activar</button>
    <button class="btn-uml" (click)="exportarUML()" [disabled]="!politicaId || exportandoUML" title="Exportar diagrama UML con IA">
      {{ exportandoUML ? '⏳' : '📐' }} UML
    </button>
    <span *ngIf="editoresActivos > 0" class="editores-badge">{{ editoresActivos }} editor{{ editoresActivos > 1 ? 'es' : '' }} activo{{ editoresActivos > 1 ? 's' : '' }}</span>
  </div>

  <!-- MAIN AREA -->
  <div class="main-area">

    <!-- LEFT PANEL -->
    <div class="left-panel">
      <div class="panel-title">Paleta</div>
      <div #paletteDiv class="palette-div"></div>

      <!-- NODE PROPERTIES -->
      <div *ngIf="selectedNode" class="props-panel">
        <div class="panel-title">Propiedades</div>
        <label>Nombre</label>
        <input [(ngModel)]="selectedNode.text" (ngModelChange)="applyNodeProps()" />
        <label>Departamento</label>
        <input [(ngModel)]="selectedNode.departamento" (ngModelChange)="applyNodeProps()" placeholder="Departamento" />
        <label>Descripción</label>
        <textarea [(ngModel)]="selectedNode.descripcion" (ngModelChange)="applyNodeProps()" rows="2" placeholder="Descripción"></textarea>
        <ng-container *ngIf="selectedNode.category === 'Task' || selectedNode.category === ''">
          <label>Tiempo límite (horas)</label>
          <input type="number" [(ngModel)]="selectedNode.tiempoLimiteHoras" (ngModelChange)="applyNodeProps()" min="0" />
        </ng-container>
        <div class="campos-header">
          <span>Campos formulario</span>
          <button class="btn-xs" (click)="addCampo()">+ Campo</button>
        </div>
        <div *ngFor="let campo of selectedNode.camposFormulario; let i = index" class="campo-row">
          <input [(ngModel)]="campo.etiqueta" placeholder="Etiqueta" class="campo-input" />
          <select [(ngModel)]="campo.tipo" class="campo-select">
            <option value="text">Texto</option>
            <option value="textarea">Área</option>
            <option value="number">Número</option>
            <option value="boolean">Sí/No</option>
            <option value="select">Selección</option>
            <option value="file">Archivo</option>
          </select>
          <button class="btn-xs danger" (click)="removeCampo(i)">✕</button>
        </div>
      </div>
    </div>

    <!-- CENTER: DIAGRAM -->
    <div class="center-panel">
      <div #diagramDiv class="diagram-div"></div>
    </div>

    <!-- RIGHT PANEL: AI ASSISTANT -->
    <div class="right-panel">
      <div class="panel-title">Asistente IA</div>
      <div class="chat-messages" #chatContainer>
        <div *ngFor="let msg of chatMessages" [class]="'chat-msg ' + msg.role">
          <span class="chat-bubble">{{ msg.text }}</span>
        </div>
        <div *ngIf="aiLoading" class="chat-msg ai">
          <span class="chat-bubble loading">Pensando...</span>
        </div>
      </div>
      <div class="quick-prompts">
        <button class="btn-quick" (click)="sendQuickPrompt('Agrega un nodo de tarea llamado Revisión')">+ Tarea</button>
        <button class="btn-quick" (click)="sendQuickPrompt('Agrega un nodo de decisión llamado ¿Aprobado?')">+ Decisión</button>
        <button class="btn-quick" (click)="sendQuickPrompt('Conecta todos los nodos en secuencia')">Conectar</button>
      </div>
      <div class="chat-input-row">
        <input
          class="chat-input"
          [(ngModel)]="chatInput"
          placeholder="Escribe un prompt..."
          (keydown.enter)="sendChat()"
        />
        <button class="btn-icon" (click)="toggleVoice()" [class.recording]="isRecording" title="Voz">🎤</button>
        <button class="btn-primary sm" (click)="sendChat()">&#9658;</button>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
    :host { display: block; height: 100vh; font-family: 'Inter', sans-serif; background: #f8fafc; }
    .editor-root { display: flex; flex-direction: column; height: 100vh; }

    /* TOOLBAR */
    .toolbar {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; background: #fff;
      border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .toolbar-input {
      border: 1px solid #cbd5e1; border-radius: 6px;
      padding: 5px 10px; font-size: 13px; outline: none;
      background: #f8fafc;
    }
    .toolbar-input.sm { width: 120px; }
    .badge {
      background: #e0f2fe; color: #0369a1;
      border-radius: 12px; padding: 2px 10px; font-size: 12px;
    }
    .editores-badge {
      background: #dcfce7; color: #166534;
      border-radius: 12px; padding: 2px 10px; font-size: 12px;
    }
    .spacer { flex: 1; }
    .btn-icon {
      background: #f1f5f9; border: 1px solid #e2e8f0;
      border-radius: 6px; padding: 5px 10px; cursor: pointer;
      font-size: 14px; transition: background 0.15s;
    }
    .btn-icon:hover { background: #e2e8f0; }
    .btn-icon.recording { background: #fee2e2; border-color: #f87171; }
    .btn-primary {
      background: #3b82f6; color: #fff; border: none;
      border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px;
    }
    .btn-primary:hover { background: #2563eb; }
    .btn-primary.sm { padding: 5px 10px; }
    .btn-secondary {
      background: #fff; color: #374151; border: 1px solid #d1d5db;
      border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px;
    }
    .btn-secondary:hover { background: #f9fafb; }
    .btn-uml {
      background: #f3e8ff; color: #7c3aed; border: 1px solid #c4b5fd;
      border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px;
    }
    .btn-uml:hover { background: #ede9fe; }
    .btn-uml:disabled { opacity: 0.6; cursor: not-allowed; }

    /* MAIN AREA */
    .main-area { display: flex; flex: 1; overflow: hidden; }

    /* LEFT PANEL */
    .left-panel {
      width: 200px; flex-shrink: 0; background: #fff;
      border-right: 1px solid #e2e8f0; display: flex;
      flex-direction: column; overflow-y: auto;
    }
    .panel-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      color: #64748b; padding: 10px 12px 4px; letter-spacing: 0.05em;
    }
    .palette-div { height: 220px; border-bottom: 1px solid #e2e8f0; }
    .props-panel { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
    .props-panel label { font-size: 11px; color: #64748b; margin-top: 4px; }
    .props-panel input, .props-panel textarea, .props-panel select {
      border: 1px solid #e2e8f0; border-radius: 5px;
      padding: 4px 7px; font-size: 12px; outline: none; width: 100%; box-sizing: border-box;
    }
    .campos-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 6px; font-size: 11px; color: #64748b;
    }
    .campo-row { display: flex; gap: 3px; align-items: center; margin-top: 3px; }
    .campo-input { flex: 1; min-width: 0; }
    .campo-select { width: 70px; }
    .btn-xs {
      background: #f1f5f9; border: 1px solid #e2e8f0;
      border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 11px;
    }
    .btn-xs.danger { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

    /* CENTER */
    .center-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .diagram-div { flex: 1; width: 100%; height: 100%; }

    /* RIGHT PANEL */
    .right-panel {
      width: 240px; flex-shrink: 0; background: #fff;
      border-left: 1px solid #e2e8f0; display: flex;
      flex-direction: column;
    }
    .chat-messages {
      flex: 1; overflow-y: auto; padding: 10px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .chat-msg { display: flex; }
    .chat-msg.user { justify-content: flex-end; }
    .chat-msg.ai { justify-content: flex-start; }
    .chat-bubble {
      max-width: 90%; padding: 7px 10px; border-radius: 10px;
      font-size: 12px; line-height: 1.4; white-space: pre-wrap; word-break: break-word;
    }
    .chat-msg.user .chat-bubble { background: #3b82f6; color: #fff; border-bottom-right-radius: 2px; }
    .chat-msg.ai .chat-bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 2px; }
    .chat-bubble.loading { color: #94a3b8; font-style: italic; }
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 10px; border-top: 1px solid #f1f5f9; }
    .btn-quick {
      background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1;
      border-radius: 12px; padding: 3px 8px; font-size: 11px; cursor: pointer;
    }
    .btn-quick:hover { background: #e0f2fe; }
    .chat-input-row {
      display: flex; gap: 4px; padding: 8px 10px;
      border-top: 1px solid #e2e8f0;
    }
    .chat-input {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 6px;
      padding: 5px 8px; font-size: 12px; outline: none;
    }
  `]
})

export class EditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('diagramDiv') diagramDiv!: ElementRef;
  @ViewChild('paletteDiv') paletteDiv!: ElementRef;

  // GoJS instances
  diagram: any;
  palette: any;

  // Policy state
  politicaId: string | null = null;
  politicaNombre = 'Nueva Política';
  politicaCategoria = '';
  politicaEstado: 'BORRADOR' | 'ACTIVA' | 'INACTIVA' = 'BORRADOR';

  // Diagram stats
  nodeCount = 0;
  linkCount = 0;

  // Selected node
  selectedNode: NodeData | null = null;

  // AI chat
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  aiLoading = false;

  // Voice
  isRecording = false;
  private recognition: any = null;

  // Collaborative
  editoresActivos = 0;

  // Change debounce
  private changeTimer: any = null;

  // UML export
  exportandoUML = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private politicaService: PoliticaService,
    private aiService: AIService,
    private wsService: WebSocketService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');
    if (this.politicaId) {
      this.politicaService.getById(this.politicaId).subscribe({
        next: (p) => this.loadPolitica(p),
        error: () => this.addAiMessage('No se pudo cargar la política.')
      });
      this.wsService.suscribirPolitica(this.politicaId, (cambio: any) => {
        this.applyRemoteChange(cambio);
      });
    }
  }

  ngAfterViewInit(): void {
    this.initDiagram();
    this.initPalette();
  }

  ngOnDestroy(): void {
    if (this.diagram) this.diagram.div = null;
    if (this.palette) this.palette.div = null;
    if (this.changeTimer) clearTimeout(this.changeTimer);
    if (this.recognition) this.recognition.stop();
  }

  // ─── GoJS Init ────────────────────────────────────────────────────────────

  private initDiagram(): void {
    const $ = go.GraphObject.make;

    this.diagram = $(go.Diagram, this.diagramDiv.nativeElement, {
      'undoManager.isEnabled': true,
      'clickCreatingTool.archetypeNodeData': { text: 'Nuevo nodo', category: '' },
      layout: $(go.LayeredDigraphLayout, { direction: 90, layerSpacing: 50, columnSpacing: 30 }),
      'animationManager.isEnabled': false,
    });

    // ── Node templates ──

    // Default / Task
    this.diagram.nodeTemplateMap.add('',
      $(go.Node, 'Auto',
        { selectionAdorned: true, resizable: false },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Rectangle', {
          fill: '#dbeafe', stroke: '#3b82f6', strokeWidth: 2,
          portId: '', fromLinkable: true, toLinkable: true,
          cursor: 'pointer', fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides
        }),
        $(go.TextBlock, { margin: new go.Margin(8, 12), editable: true, font: '13px Inter, sans-serif', stroke: '#1e40af' },
          new go.Binding('text').makeTwoWay())
      )
    );

    // Start
    this.diagram.nodeTemplateMap.add('Start',
      $(go.Node, 'Auto',
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Capsule', {
          fill: '#dcfce7', stroke: '#16a34a', strokeWidth: 2,
          portId: '', fromLinkable: true, toLinkable: true,
          cursor: 'pointer', fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides
        }),
        $(go.TextBlock, { margin: new go.Margin(8, 16), editable: true, font: 'bold 13px Inter, sans-serif', stroke: '#166534' },
          new go.Binding('text').makeTwoWay())
      )
    );

    // End
    this.diagram.nodeTemplateMap.add('End',
      $(go.Node, 'Auto',
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Capsule', {
          fill: '#fee2e2', stroke: '#dc2626', strokeWidth: 2,
          portId: '', fromLinkable: true, toLinkable: true,
          cursor: 'pointer', fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides
        }),
        $(go.TextBlock, { margin: new go.Margin(8, 16), editable: true, font: 'bold 13px Inter, sans-serif', stroke: '#991b1b' },
          new go.Binding('text').makeTwoWay())
      )
    );

    // Decision
    this.diagram.nodeTemplateMap.add('Decision',
      $(go.Node, 'Auto',
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Diamond', {
          fill: '#ffedd5', stroke: '#ea580c', strokeWidth: 2,
          portId: '', fromLinkable: true, toLinkable: true,
          cursor: 'pointer', fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides
        }),
        $(go.TextBlock, { margin: new go.Margin(10, 14), editable: true, font: '13px Inter, sans-serif', stroke: '#9a3412', textAlign: 'center' },
          new go.Binding('text').makeTwoWay())
      )
    );

    // Parallel
    this.diagram.nodeTemplateMap.add('Parallel',
      $(go.Node, 'Auto',
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Rectangle', {
          fill: '#f3e8ff', stroke: '#9333ea', strokeWidth: 2,
          portId: '', fromLinkable: true, toLinkable: true,
          cursor: 'pointer', fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides
        }),
        $(go.TextBlock, { margin: new go.Margin(8, 12), editable: true, font: '13px Inter, sans-serif', stroke: '#6b21a8' },
          new go.Binding('text').makeTwoWay())
      )
    );

    // ── Link template ──
    this.diagram.linkTemplate = $(go.Link,
      {
        routing: go.Routing.AvoidsNodes,
        corner: 5,
        reshapable: true,
        relinkableFrom: true,
        relinkableTo: true,
        toShortLength: 4,
      },
      $(go.Shape, { strokeWidth: 1.5, stroke: '#64748b' }),
      $(go.Shape, { toArrow: 'Standard', fill: '#64748b', stroke: null }),
      $(go.TextBlock, {
        segmentOffset: new go.Point(0, -10),
        font: '11px Inter, sans-serif',
        stroke: '#64748b',
        editable: true,
      }, new go.Binding('text').makeTwoWay())
    );

    // ── Selection listener ──
    this.diagram.addDiagramListener('ChangedSelection', () => {
      const sel = this.diagram.selection.first();
      if (sel instanceof go.Node) {
        const d = sel.data;
        this.selectedNode = {
          key: d.key,
          text: d.text || '',
          category: d.category || '',
          departamento: d.departamento || '',
          descripcion: d.descripcion || '',
          tiempoLimiteHoras: d.tiempoLimiteHoras,
          camposFormulario: d.camposFormulario ? [...d.camposFormulario] : [],
        };
      } else {
        this.selectedNode = null;
      }
      this.cdr.detectChanges();
    });

    // ── Change listener ──
    this.diagram.addDiagramListener('Modified', () => {
      this.onDiagramChanged();
    });

    // Seed initial nodes
    this.diagram.model = new go.GraphLinksModel(
      [
        { key: 1, text: 'Inicio', category: 'Start', loc: '100 100' },
        { key: 2, text: 'Tarea 1', category: '', loc: '100 220' },
        { key: 3, text: 'Fin', category: 'End', loc: '100 340' },
      ],
      [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ]
    );
    this.updateCounts();
  }

  private initPalette(): void {
    const $ = go.GraphObject.make;
    this.palette = $(go.Palette, this.paletteDiv.nativeElement, {
      nodeTemplateMap: this.diagram.nodeTemplateMap,
      layout: $(go.GridLayout, { wrappingColumn: 1, cellSize: new go.Size(1, 1), spacing: new go.Size(4, 4) }),
    });
    this.palette.model = new go.GraphLinksModel([
      { key: 'p1', text: 'Inicio', category: 'Start' },
      { key: 'p2', text: 'Tarea', category: '' },
      { key: 'p3', text: 'Decisión', category: 'Decision' },
      { key: 'p4', text: 'Paralelo', category: 'Parallel' },
      { key: 'p5', text: 'Fin', category: 'End' },
    ]);
  }

  // ─── Diagram helpers ──────────────────────────────────────────────────────

  private onDiagramChanged(): void {
    this.updateCounts();
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => {
      if (this.politicaId) {
        const cambio = { modelo: this.diagram.model.toJson() };
        this.wsService.enviarCambioDiagrama(this.politicaId, cambio);
      }
    }, 800);
  }

  private updateCounts(): void {
    if (!this.diagram) return;
    this.nodeCount = this.diagram.nodes.count;
    this.linkCount = this.diagram.links.count;
    this.cdr.detectChanges();
  }

  applyNodeProps(): void {
    if (!this.selectedNode || !this.diagram) return;
    this.diagram.startTransaction('update node props');
    const node = this.diagram.findNodeForKey(this.selectedNode.key);
    if (node) {
      this.diagram.model.setDataProperty(node.data, 'text', this.selectedNode.text);
      this.diagram.model.setDataProperty(node.data, 'departamento', this.selectedNode.departamento);
      this.diagram.model.setDataProperty(node.data, 'descripcion', this.selectedNode.descripcion);
      this.diagram.model.setDataProperty(node.data, 'tiempoLimiteHoras', this.selectedNode.tiempoLimiteHoras);
      this.diagram.model.setDataProperty(node.data, 'camposFormulario', this.selectedNode.camposFormulario);
    }
    this.diagram.commitTransaction('update node props');
  }

  addCampo(): void {
    if (!this.selectedNode) return;
    if (!this.selectedNode.camposFormulario) this.selectedNode.camposFormulario = [];
    this.selectedNode.camposFormulario.push({
      nombre: 'campo_' + Date.now(),
      tipo: 'text',
      etiqueta: 'Nuevo campo',
      requerido: false,
    });
    this.applyNodeProps();
  }

  removeCampo(i: number): void {
    if (!this.selectedNode?.camposFormulario) return;
    this.selectedNode.camposFormulario.splice(i, 1);
    this.applyNodeProps();
  }

  zoomIn(): void { if (this.diagram) this.diagram.commandHandler.increaseZoom(); }
  zoomOut(): void { if (this.diagram) this.diagram.commandHandler.decreaseZoom(); }

  // ─── Load / Save ──────────────────────────────────────────────────────────

  private loadPolitica(p: Politica): void {
    this.politicaNombre = p.nombre;
    this.politicaCategoria = p.categoria || '';
    this.politicaEstado = p.estado;
    if (p.nodos && p.nodos.length > 0) {
      this.loadNodosIntoDiagram(p.nodos);
    }
  }

  private loadNodosIntoDiagram(nodos: Nodo[]): void {
    const nodeDataArray: any[] = nodos.map((n) => ({
      key: n.id,
      text: n.nombre,
      category: this.tipoToCategory(n.tipo),
      loc: `${n.posX} ${n.posY}`,
      departamento: n.departamento,
      descripcion: n.descripcion,
      tiempoLimiteHoras: n.tiempoLimiteHoras,
      camposFormulario: n.camposFormulario,
    }));

    const linkDataArray: any[] = [];
    nodos.forEach((n) => {
      (n.conexiones || []).forEach((targetId) => {
        linkDataArray.push({ from: n.id, to: targetId });
      });
    });

    this.diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    this.updateCounts();
  }

  save(): void {
    const nodos = this.extractNodos();
    const payload: Partial<Politica> = {
      nombre: this.politicaNombre,
      descripcion: '',
      categoria: this.politicaCategoria,
      nodos,
      estado: this.politicaEstado,
      creadoPorId: this.authService.getUser()?.id || '',
    };

    if (this.politicaId) {
      this.politicaService.update(this.politicaId, payload).subscribe({
        next: () => this.addAiMessage('Política guardada correctamente.'),
        error: () => this.addAiMessage('Error al guardar la política.'),
      });
    } else {
      this.politicaService.create(payload).subscribe({
        next: (p) => {
          this.politicaId = p.id;
          this.addAiMessage('Política creada correctamente.');
        },
        error: () => this.addAiMessage('Error al crear la política.'),
      });
    }
  }

  activate(): void {
    if (!this.politicaId) { this.save(); return; }
    this.politicaService.activar(this.politicaId).subscribe({
      next: (p) => {
        this.politicaEstado = p.estado;
        this.addAiMessage('Política activada.');
      },
      error: () => this.addAiMessage('Error al activar la política.'),
    });
  }

  goBack(): void { this.router.navigate(['/admin']); }

  exportarUML(): void {
    if (!this.politicaId) return;
    this.exportandoUML = true;
    this.addAiMessage('Generando diagrama UML con IA...');
    this.aiService.generarPlantUML(this.politicaId).subscribe({
      next: (resp) => {
        this.exportandoUML = false;
        const blob = new Blob([resp.plantuml], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.politicaNombre.replace(/\s+/g, '_')}_UML.puml`;
        a.click();
        URL.revokeObjectURL(url);
        this.addAiMessage('✅ Diagrama UML exportado. Abre el archivo .puml en PlantUML o https://www.plantuml.com/plantuml/uml/');
        this.cdr.detectChanges();
      },
      error: () => {
        this.exportandoUML = false;
        this.addAiMessage('❌ Error al generar el UML. Verifica que la política esté guardada.');
        this.cdr.detectChanges();
      }
    });
  }

  private extractNodos(): Nodo[] {
    const nodos: Nodo[] = [];
    this.diagram.nodes.each((node: any) => {
      const d = node.data;
      const loc = go.Point.parse(d.loc || '0 0');
      nodos.push({
        id: String(d.key),
        nombre: d.text || '',
        descripcion: d.descripcion || '',
        tipo: this.categoryToTipo(d.category || ''),
        departamento: d.departamento || '',
        responsableId: '',
        tiempoLimiteHoras: d.tiempoLimiteHoras,
        posX: loc.x,
        posY: loc.y,
        conexiones: [],
        condiciones: {},
        camposFormulario: d.camposFormulario || [],
      });
    });

    // Build conexiones from links
    this.diagram.links.each((link: any) => {
      const fromKey = String(link.data.from);
      const toKey = String(link.data.to);
      const nodo = nodos.find((n) => n.id === fromKey);
      if (nodo && !nodo.conexiones.includes(toKey)) {
        nodo.conexiones.push(toKey);
      }
    });

    return nodos;
  }

  private tipoToCategory(tipo: string): string {
    const map: Record<string, string> = {
      START: 'Start', END: 'End', TASK: '', DECISION: 'Decision', PARALLEL: 'Parallel',
    };
    return map[tipo] ?? '';
  }

  private categoryToTipo(cat: string): Nodo['tipo'] {
    const map: Record<string, Nodo['tipo']> = {
      Start: 'START', End: 'END', '': 'TASK', Decision: 'DECISION', Parallel: 'PARALLEL',
    };
    return map[cat] ?? 'TASK';
  }

  // ─── Remote changes ───────────────────────────────────────────────────────

  private applyRemoteChange(cambio: any): void {
    if (cambio.editoresActivos !== undefined) {
      this.editoresActivos = cambio.editoresActivos;
      this.cdr.detectChanges();
    }
    if (cambio.modelo && this.diagram) {
      try {
        this.diagram.model = go.Model.fromJson(cambio.modelo);
        this.updateCounts();
      } catch { /* ignore malformed */ }
    }
  }

  // ─── AI Chat ──────────────────────────────────────────────────────────────

  sendChat(): void {
    const prompt = this.chatInput.trim();
    if (!prompt) return;
    this.chatMessages.push({ role: 'user', text: prompt });
    this.chatInput = '';
    this.aiLoading = true;
    this.cdr.detectChanges();

    this.aiService.procesarPromptDiagrama(prompt).subscribe({
      next: (resp) => {
        this.aiLoading = false;
        this.applyAiResponse(resp);
        this.cdr.detectChanges();
      },
      error: () => {
        this.aiLoading = false;
        this.addAiMessage('Error al contactar el asistente IA.');
        this.cdr.detectChanges();
      },
    });
  }

  sendQuickPrompt(prompt: string): void {
    this.chatInput = prompt;
    this.sendChat();
  }

  private applyAiResponse(resp: string): void {
    // Limpiar la respuesta — quitar markdown si viene envuelto
    const cleaned = resp
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    try {
      // Intentar parsear JSON directamente
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        this.addAiMessage(resp);
        return;
      }

      const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));

      // Formato nuevo: { nodos: [...], links: [...], mensaje: "..." }
      const nodos: any[] = parsed.nodos || parsed.nodes || [];
      const links: any[] = parsed.links || parsed.enlaces || [];
      const mensaje: string = parsed.mensaje || parsed.message || '';

      if (nodos.length > 0 || links.length > 0) {
        this.diagram.startTransaction('ai update');

        // Agregar/actualizar nodos
        nodos.forEach((n: any) => {
          const key = n.key ?? n.id;
          const existing = this.diagram.findNodeForKey(key);
          if (existing) {
            // Actualizar nodo existente
            this.diagram.model.setDataProperty(existing.data, 'text', n.text || n.nombre || existing.data.text);
            if (n.departamento) {
              this.diagram.model.setDataProperty(existing.data, 'departamento', n.departamento);
            }
          } else {
            // Agregar nuevo nodo
            const newKey = key ?? (Date.now() + Math.floor(Math.random() * 1000));
            (this.diagram.model as any).addNodeData({
              key: newKey,
              text: n.text || n.nombre || 'Nodo',
              category: n.category ?? this.tipoToCategory(n.tipo || 'TASK'),
              departamento: n.departamento || '',
            });
          }
        });

        // Agregar enlaces
        links.forEach((l: any) => {
          const from = l.from ?? l.desde;
          const to = l.to ?? l.hasta;
          if (from !== undefined && to !== undefined) {
            (this.diagram.model as any).addLinkData({
              from: from,
              to: to,
              text: l.text || l.etiqueta || '',
            });
          }
        });

        this.diagram.commitTransaction('ai update');
        this.diagram.layoutDiagram(true); // Re-layout para organizar nodos nuevos

        const resumen = mensaje || `✅ ${nodos.length > 0 ? nodos.length + ' nodo(s) agregado(s)' : ''}${links.length > 0 ? (nodos.length > 0 ? ', ' : '') + links.length + ' conexión(es) creada(s)' : ''}`;
        this.addAiMessage(resumen);
        return;
      }

      // Solo mensaje descriptivo
      if (mensaje) {
        this.addAiMessage(mensaje);
        return;
      }

    } catch (e) {
      // No es JSON válido — mostrar como texto
    }

    // Fallback: mostrar respuesta como texto
    this.addAiMessage(resp.length > 500 ? resp.substring(0, 500) + '...' : resp);
  }

  private addAiMessage(text: string): void {
    this.chatMessages.push({ role: 'ai', text });
    this.cdr.detectChanges();
  }

  // ─── Voice ────────────────────────────────────────────────────────────────

  toggleVoice(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.addAiMessage('Tu navegador no soporta reconocimiento de voz.');
      return;
    }
    if (this.isRecording) {
      this.recognition?.stop();
      this.isRecording = false;
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      this.chatInput = transcript;
      this.isRecording = false;
      this.cdr.detectChanges();
      this.sendChat();
    };
    this.recognition.onerror = () => {
      this.isRecording = false;
      this.cdr.detectChanges();
    };
    this.recognition.onend = () => {
      this.isRecording = false;
      this.cdr.detectChanges();
    };
    this.recognition.start();
    this.isRecording = true;
  }
}
