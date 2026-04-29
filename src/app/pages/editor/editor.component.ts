declare const go: any;
import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PoliticaService } from '../../services/politica/politica.service';
import { AIService } from '../../services/ai/ai.service';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { AuthService } from '../../services/auth/auth.service';
import { Politica, Nodo, CampoFormulario } from '../../models/models';

interface ChatMessage { role: 'user' | 'ai'; text: string; }
interface NodeData {
  key: any; text: string; category: string; group?: any;
  departamento?: string; descripcion?: string;
  tiempoLimiteHoras?: number; camposFormulario?: CampoFormulario[]; loc?: string;
}
interface LaneData { key: any; text: string; isGroup: boolean; category: string; }

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="editor-root">
  <div class="toolbar">
    <button class="btn-icon" (click)="goBack()">&#8592; Volver</button>
    <div class="tsep"></div>
    <input class="tinput" [(ngModel)]="politicaNombre" placeholder="Nombre de la politica" />
    <input class="tinput sm" [(ngModel)]="politicaCategoria" placeholder="Categoria" />
    <div class="tsep"></div>
    <span class="tbadge">{{ laneCount }} calles | {{ nodeCount }} nodos | {{ linkCount }} enlaces</span>
    <div class="spacer"></div>
    <button class="btn-lane" (click)="addLane()">+ Calle</button>
    <button class="btn-icon" (click)="zoomFit()">&#8862;</button>
    <button class="btn-icon" (click)="zoomIn()">+</button>
    <button class="btn-icon" (click)="zoomOut()">-</button>
    <div class="tsep"></div>
    <button class="btn-sec" (click)="save()" [disabled]="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
    <button class="btn-pri" (click)="activate()" [disabled]="politicaEstado === 'ACTIVA'">{{ politicaEstado === 'ACTIVA' ? 'Activa' : 'Activar' }}</button>
    <button class="btn-uml" (click)="exportarUML()" [disabled]="!politicaId || exportandoUML">{{ exportandoUML ? '...' : 'UML' }}</button>
    @if (editoresActivos > 0) { <span class="tbadge green">{{ editoresActivos }} editor(es)</span> }
  </div>
  <div class="main-area">
    <div class="left-panel">
      <div class="ptitle">Paleta</div>
      <div #paletteDiv class="palette-div"></div>
      @if (selectedNode) {
        <div class="props-panel">
          <div class="ptitle">Propiedades</div>
          <label class="plabel">Nombre</label>
          <input class="pinput" [(ngModel)]="selectedNode.text" (ngModelChange)="applyNodeProps()" />
          @if (selectedNode.category !== 'Start' && selectedNode.category !== 'End') {
            <label class="plabel">Departamento / Calle</label>
            <select class="pinput" [(ngModel)]="selectedNode.departamento" (ngModelChange)="moveNodeToLane($event)">
              @for (lane of lanes; track lane.key) {
                <option [value]="lane.text">{{ lane.text }}</option>
              }
            </select>
            <label class="plabel">Descripcion / Instrucciones</label>
            <textarea class="pinput" [(ngModel)]="selectedNode.descripcion" (ngModelChange)="applyNodeProps()" rows="2"></textarea>
            @if (selectedNode.category === '' || selectedNode.category === 'Task') {
              <label class="plabel">Tiempo limite (horas)</label>
              <input type="number" class="pinput" [(ngModel)]="selectedNode.tiempoLimiteHoras" (ngModelChange)="applyNodeProps()" min="0" />
              <div class="campos-hdr">
                <span class="plabel" style="margin:0">Campos del formulario</span>
                <button class="btn-xs" (click)="addCampo()">+ Campo</button>
              </div>
              @for (campo of selectedNode.camposFormulario || []; track $index; let i = $index) {
                <div class="campo-row">
                  <input [(ngModel)]="campo.etiqueta" placeholder="Etiqueta" class="cinput" (ngModelChange)="applyNodeProps()" />
                  <select [(ngModel)]="campo.tipo" class="csel" (ngModelChange)="applyNodeProps()">
                    <option value="text">Texto</option>
                    <option value="textarea">Area</option>
                    <option value="number">Numero</option>
                    <option value="boolean">Si/No</option>
                    <option value="select">Lista</option>
                    <option value="file">Archivo</option>
                    <option value="grid">Tabla</option>
                  </select>
                  <label class="req-chk" title="Requerido"><input type="checkbox" [(ngModel)]="campo.requerido" (ngModelChange)="applyNodeProps()" /><span>*</span></label>
                  <button class="btn-xs danger" (click)="removeCampo(i)">x</button>
                </div>
              }
            }
          }
        </div>
      } @else {
        <div class="hint-panel">
          <p class="hint">Haz clic en un nodo para editar sus propiedades</p>
          <p class="hint">Arrastra nodos entre calles para cambiar departamento</p>
          <p class="hint">Arrastra desde el borde de un nodo para conectar</p>
          <p class="hint">Usa "+ Calle" para agregar departamentos</p>
        </div>
      }
    </div>
    <div class="center-panel">
      <div #diagramDiv class="diagram-div"></div>
    </div>
    <div class="right-panel">
      <div class="ptitle" style="padding:10px 12px 6px">Asistente IA</div>
      <div class="chat-msgs" #chatContainer>
        @for (msg of chatMessages; track $index) {
          <div [class]="'cmsg ' + msg.role"><span class="cbubble">{{ msg.text }}</span></div>
        }
        @if (aiLoading) { <div class="cmsg ai"><span class="cbubble loading">Pensando...</span></div> }
      </div>
      <div class="quick-prompts">
        <button class="btn-q" (click)="sendQuickPrompt('Agrega una calle para el departamento Legal')">+ Calle</button>
        <button class="btn-q" (click)="sendQuickPrompt('Agrega un nodo de tarea llamado Revision')">+ Tarea</button>
        <button class="btn-q" (click)="sendQuickPrompt('Agrega un nodo de decision llamado Aprobado')">+ Decision</button>
        <button class="btn-q" (click)="sendQuickPrompt('Conecta todos los nodos en secuencia')">Conectar</button>
        <button class="btn-q" (click)="sendQuickPrompt('Agrega flujo completo: inicio, revision tecnica, aprobacion gerencial, fin')">Flujo</button>
      </div>
      <div class="chat-input-row">
        <input class="chat-input" [(ngModel)]="chatInput" placeholder="Describe cambios al diagrama..." (keydown.enter)="sendChat()" />
        <button class="btn-icon" (click)="toggleVoice()" [class.recording]="isRecording">mic</button>
        <button class="btn-send" (click)="sendChat()">&#9658;</button>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .editor-root { display: flex; flex-direction: column; height: 100vh; font-family: 'Space Grotesk', sans-serif; background: #f1f5f9; }
    .toolbar { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .tinput { border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 10px; font-size: 13px; outline: none; background: #f8fafc; font-family: inherit; }
    .tinput.sm { width: 110px; }
    .tsep { width: 1px; height: 24px; background: #e2e8f0; margin: 0 2px; }
    .tbadge { background: #e0f2fe; color: #0369a1; border-radius: 12px; padding: 2px 10px; font-size: 11px; white-space: nowrap; }
    .tbadge.green { background: #dcfce7; color: #166534; }
    .spacer { flex: 1; }
    .btn-icon { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px; }
    .btn-icon:hover { background: #e2e8f0; }
    .btn-icon.recording { background: #fee2e2; border-color: #f87171; }
    .btn-lane { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 6px; padding: 5px 12px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; }
    .btn-lane:hover { background: #dcfce7; }
    .btn-pri { background: #3b82f6; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px; font-family: inherit; }
    .btn-pri:hover:not(:disabled) { background: #2563eb; }
    .btn-pri:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-sec { background: #fff; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px; font-family: inherit; }
    .btn-sec:hover:not(:disabled) { background: #f9fafb; }
    .btn-sec:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-uml { background: #f3e8ff; color: #7c3aed; border: 1px solid #c4b5fd; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; font-family: inherit; }
    .btn-uml:hover:not(:disabled) { background: #ede9fe; }
    .btn-uml:disabled { opacity: 0.6; cursor: not-allowed; }
    .main-area { display: flex; flex: 1; overflow: hidden; }
    .left-panel { width: 210px; flex-shrink: 0; background: #fff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow-y: auto; }
    .ptitle { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; padding: 10px 12px 4px; letter-spacing: 0.06em; border-bottom: 1px solid #f1f5f9; }
    .palette-div { height: 200px; border-bottom: 1px solid #e2e8f0; }
    .props-panel { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
    .plabel { font-size: 10px; color: #64748b; font-weight: 600; margin-top: 4px; display: block; }
    .pinput { border: 1px solid #e2e8f0; border-radius: 5px; padding: 5px 8px; font-size: 12px; outline: none; width: 100%; box-sizing: border-box; font-family: inherit; }
    .pinput:focus { border-color: #3b82f6; }
    .campos-hdr { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
    .campo-row { display: flex; gap: 3px; align-items: center; margin-top: 3px; }
    .cinput { flex: 1; min-width: 0; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 6px; font-size: 11px; outline: none; }
    .csel { width: 68px; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 4px; font-size: 11px; outline: none; }
    .req-chk { display: flex; align-items: center; gap: 2px; cursor: pointer; font-size: 11px; color: #ef4444; font-weight: 700; }
    .req-chk input { width: 12px; height: 12px; }
    .btn-xs { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 11px; }
    .btn-xs.danger { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
    .hint-panel { padding: 12px 10px; }
    .hint { font-size: 11px; color: #94a3b8; margin: 0 0 6px; line-height: 1.4; }
    .center-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .diagram-div { flex: 1; width: 100%; height: 100%; }
    .right-panel { width: 240px; flex-shrink: 0; background: #fff; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; }
    .chat-msgs { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .cmsg { display: flex; }
    .cmsg.user { justify-content: flex-end; }
    .cmsg.ai { justify-content: flex-start; }
    .cbubble { max-width: 92%; padding: 7px 10px; border-radius: 10px; font-size: 12px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
    .cmsg.user .cbubble { background: #3b82f6; color: #fff; border-bottom-right-radius: 2px; }
    .cmsg.ai .cbubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 2px; }
    .cbubble.loading { color: #94a3b8; font-style: italic; }
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 10px; border-top: 1px solid #f1f5f9; }
    .btn-q { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; border-radius: 12px; padding: 3px 8px; font-size: 10px; cursor: pointer; font-family: inherit; }
    .btn-q:hover { background: #e0f2fe; }
    .chat-input-row { display: flex; gap: 4px; padding: 8px 10px; border-top: 1px solid #e2e8f0; }
    .chat-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px 8px; font-size: 12px; outline: none; font-family: inherit; }
    .btn-send { background: #3b82f6; color: #fff; border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 14px; }
    .btn-send:hover { background: #2563eb; }
  `]
})
export class EditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('diagramDiv') diagramDiv!: ElementRef;
  @ViewChild('paletteDiv') paletteDiv!: ElementRef;

  diagram: any; palette: any;
  politicaId: string | null = null;
  politicaNombre = 'Nueva Politica';
  politicaCategoria = '';
  politicaEstado: 'BORRADOR' | 'ACTIVA' | 'INACTIVA' = 'BORRADOR';
  nodeCount = 0; linkCount = 0; laneCount = 0;
  saving = false; exportandoUML = false; editoresActivos = 0;
  selectedNode: NodeData | null = null;
  lanes: LaneData[] = [];
  chatMessages: ChatMessage[] = [{ role: 'ai', text: 'Hola! Describe los cambios que quieres hacer al diagrama. Puedo agregar nodos, calles, conexiones y mas.' }];
  chatInput = ''; aiLoading = false; isRecording = false;
  private recognition: any = null;
  private changeTimer: any = null;

  constructor(
    private route: ActivatedRoute, private router: Router,
    private politicaService: PoliticaService, private aiService: AIService,
    private wsService: WebSocketService, private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');
    if (this.politicaId) {
      this.politicaService.getById(this.politicaId).subscribe({
        next: (p) => this.loadPolitica(p),
        error: () => this.addAiMsg('No se pudo cargar la politica.')
      });
      this.wsService.suscribirPolitica(this.politicaId, (c: any) => this.applyRemoteChange(c));
    }
  }

  ngAfterViewInit(): void { this.initDiagram(); this.initPalette(); }

  ngOnDestroy(): void {
    if (this.diagram) this.diagram.div = null;
    if (this.palette) this.palette.div = null;
    if (this.changeTimer) clearTimeout(this.changeTimer);
    if (this.recognition) this.recognition.stop();
  }

  // ── GoJS Swimlane Init ────────────────────────────────────────────────────
  private initDiagram(): void {
    const $ = go.GraphObject.make;

    this.diagram = $(go.Diagram, this.diagramDiv.nativeElement, {
      'undoManager.isEnabled': true,
      'animationManager.isEnabled': false,
      layout: $(go.GridLayout, { wrappingColumn: 1, cellSize: new go.Size(1, 1) }),
      'draggingTool.dragsTree': false,
      'draggingTool.isGridSnapEnabled': true,
      'draggingTool.gridSnapCellSize': new go.Size(10, 10),
    });

    // ── POOL (contenedor de todas las calles) ──
    this.diagram.groupTemplateMap.add('Pool',
      $(go.Group, 'Auto',
        {
          layout: $(go.GridLayout, {
            wrappingColumn: 1, cellSize: new go.Size(1, 1),
            spacing: new go.Size(0, 0),
          }),
          isSubGraphExpanded: true,
          computesBoundsAfterDrag: true,
          computesBoundsIncludingLinks: false,
          handlesDragDropForMembers: true,
          mouseDrop: (e: any, grp: any) => this.finishDrop(e, grp),
        },
        $(go.Shape, 'Rectangle', { fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 1.5 }),
        $(go.Panel, 'Table', { defaultRowSeparatorStroke: '#e2e8f0' },
          $(go.Panel, 'Horizontal',
            { row: 0, stretch: go.GraphObject.Horizontal, background: '#1e293b', defaultAlignment: go.Spot.Left },
            $(go.TextBlock, {
              font: 'bold 13px Space Grotesk, sans-serif', stroke: '#f1f5f9',
              margin: new go.Margin(8, 16), editable: true,
            }, new go.Binding('text').makeTwoWay())
          ),
          $(go.Placeholder, { row: 1, padding: new go.Margin(4, 4) })
        )
      )
    );

    // ── LANE (calle / departamento) ──
    this.diagram.groupTemplateMap.add('Lane',
      $(go.Group, 'Vertical',
        {
          selectionObjectName: 'SHAPE',
          resizable: true,
          resizeObjectName: 'SHAPE',
          layout: $(go.LayeredDigraphLayout, {
            direction: 0,
            layerSpacing: 80,
            columnSpacing: 30,
            setsPortSpots: false,
          }),
          computesBoundsAfterDrag: true,
          computesBoundsIncludingLinks: false,
          handlesDragDropForMembers: true,
          mouseDrop: (e: any, grp: any) => this.finishDrop(e, grp),
          memberAdded: () => this.onDiagramChanged(),
          memberRemoved: () => this.onDiagramChanged(),
        },
        $(go.Panel, 'Horizontal',
          { name: 'SHAPE', minSize: new go.Size(700, 120) },
          new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify),
          $(go.Shape, 'Rectangle', {
            fill: 'transparent', stroke: '#cbd5e1', strokeWidth: 1,
            stretch: go.GraphObject.Fill,
          })
        ),
        $(go.TextBlock, {
          name: 'LABEL',
          font: 'bold 11px Space Grotesk, sans-serif',
          stroke: '#475569',
          editable: true,
          angle: 270,
          alignment: go.Spot.Left,
          margin: new go.Margin(4, 0),
        }, new go.Binding('text').makeTwoWay()),
        $(go.Placeholder, { padding: new go.Margin(20, 10) })
      )
    );

    // ── NODO START ──
    this.diagram.nodeTemplateMap.add('Start',
      $(go.Node, 'Auto',
        { fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides, cursor: 'pointer',
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup) },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Circle', { fill: '#166534', stroke: '#14532d', strokeWidth: 2, width: 40, height: 40,
          portId: '', fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides }),
        $(go.TextBlock, { font: 'bold 11px Space Grotesk, sans-serif', stroke: '#fff', margin: 4, editable: true },
          new go.Binding('text').makeTwoWay())
      )
    );

    // ── NODO END ──
    this.diagram.nodeTemplateMap.add('End',
      $(go.Node, 'Auto',
        { fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides, cursor: 'pointer',
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup) },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Circle', { fill: '#991b1b', stroke: '#7f1d1d', strokeWidth: 3, width: 40, height: 40,
          portId: '', fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides }),
        $(go.TextBlock, { font: 'bold 11px Space Grotesk, sans-serif', stroke: '#fff', margin: 4, editable: true },
          new go.Binding('text').makeTwoWay())
      )
    );

    // ── NODO TASK (default) ──
    this.diagram.nodeTemplateMap.add('',
      $(go.Node, 'Auto',
        { fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides, cursor: 'pointer',
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup) },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'RoundedRectangle', { fill: '#dbeafe', stroke: '#3b82f6', strokeWidth: 2,
          portId: '', fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides,
          minSize: new go.Size(110, 44) }),
        $(go.Panel, 'Vertical', { margin: new go.Margin(6, 10) },
          $(go.TextBlock, { font: 'bold 12px Space Grotesk, sans-serif', stroke: '#1e40af', editable: true,
            textAlign: 'center', maxLines: 2, overflow: go.TextBlock.OverflowEllipsis, width: 110 },
            new go.Binding('text').makeTwoWay()),
          $(go.TextBlock, { font: '10px Space Grotesk, sans-serif', stroke: '#64748b', textAlign: 'center',
            maxLines: 1, overflow: go.TextBlock.OverflowEllipsis, width: 110 },
            new go.Binding('text', 'departamento', (d: string) => d ? d : ''))
        )
      )
    );

    // ── NODO DECISION ──
    this.diagram.nodeTemplateMap.add('Decision',
      $(go.Node, 'Auto',
        { fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides, cursor: 'pointer',
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup) },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Diamond', { fill: '#ffedd5', stroke: '#ea580c', strokeWidth: 2,
          portId: '', fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides,
          minSize: new go.Size(100, 60) }),
        $(go.TextBlock, { font: '12px Space Grotesk, sans-serif', stroke: '#9a3412', editable: true,
          textAlign: 'center', maxLines: 2, overflow: go.TextBlock.OverflowEllipsis, width: 90, margin: new go.Margin(8, 10) },
          new go.Binding('text').makeTwoWay())
      )
    );

    // ── NODO PARALLEL ──
    this.diagram.nodeTemplateMap.add('Parallel',
      $(go.Node, 'Auto',
        { fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides, cursor: 'pointer',
          mouseDrop: (e: any, node: any) => this.finishDrop(e, node.containingGroup) },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Rectangle', { fill: '#f3e8ff', stroke: '#9333ea', strokeWidth: 2,
          portId: '', fromLinkable: true, toLinkable: true, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides,
          minSize: new go.Size(110, 44) }),
        $(go.Panel, 'Vertical', { margin: new go.Margin(6, 10) },
          $(go.TextBlock, '||', { font: 'bold 14px monospace', stroke: '#7c3aed' }),
          $(go.TextBlock, { font: '12px Space Grotesk, sans-serif', stroke: '#6b21a8', editable: true,
            textAlign: 'center', maxLines: 2, overflow: go.TextBlock.OverflowEllipsis, width: 100 },
            new go.Binding('text').makeTwoWay())
        )
      )
    );

    // ── LINK template ──
    this.diagram.linkTemplate = $(go.Link,
      { routing: go.Routing.AvoidsNodes, corner: 8, reshapable: true, relinkableFrom: true, relinkableTo: true, toShortLength: 4 },
      $(go.Shape, { strokeWidth: 1.8, stroke: '#64748b' }),
      $(go.Shape, { toArrow: 'Standard', fill: '#64748b', stroke: null, scale: 1.2 }),
      $(go.TextBlock, { segmentOffset: new go.Point(0, -12), font: '11px Space Grotesk, sans-serif',
        stroke: '#475569', editable: true, background: 'rgba(255,255,255,0.85)', margin: new go.Margin(1, 3) },
        new go.Binding('text').makeTwoWay())
    );

    // ── Selection listener ──
    this.diagram.addDiagramListener('ChangedSelection', () => {
      const sel = this.diagram.selection.first();
      if (sel instanceof go.Node && sel.data.category !== 'Lane' && sel.data.category !== 'Pool') {
        const d = sel.data;
        this.selectedNode = {
          key: d.key, text: d.text || '', category: d.category || '',
          group: d.group, departamento: d.departamento || '',
          descripcion: d.descripcion || '', tiempoLimiteHoras: d.tiempoLimiteHoras,
          camposFormulario: d.camposFormulario ? JSON.parse(JSON.stringify(d.camposFormulario)) : [],
        };
      } else {
        this.selectedNode = null;
      }
      this.syncLanes();
      this.cdr.detectChanges();
    });

    // ── Change listener ──
    this.diagram.addDiagramListener('Modified', () => this.onDiagramChanged());

    // ── Initial model with 2 swimlanes ──
    this.buildInitialModel();
  }

  private buildInitialModel(): void {
    const nodeDataArray: any[] = [
      { key: 'pool1', text: 'Proceso', isGroup: true, category: 'Pool' },
      { key: 'lane1', text: 'Departamento A', isGroup: true, category: 'Lane', group: 'pool1', size: '700 140' },
      { key: 'lane2', text: 'Departamento B', isGroup: true, category: 'Lane', group: 'pool1', size: '700 140' },
      { key: 1, text: 'Inicio', category: 'Start', group: 'lane1', loc: '80 60' },
      { key: 2, text: 'Tarea 1', category: '', group: 'lane1', loc: '240 60', departamento: 'Departamento A' },
      { key: 3, text: 'Tarea 2', category: '', group: 'lane2', loc: '400 60', departamento: 'Departamento B' },
      { key: 4, text: 'Fin', category: 'End', group: 'lane2', loc: '560 60' },
    ];
    const linkDataArray: any[] = [
      { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
    ];
    this.diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    this.diagram.model.nodeGroupKeyProperty = 'group';
    this.syncLanes();
    this.updateCounts();
  }

  private initPalette(): void {
    const $ = go.GraphObject.make;
    this.palette = $(go.Palette, this.paletteDiv.nativeElement, {
      nodeTemplateMap: this.diagram.nodeTemplateMap,
      layout: $(go.GridLayout, { wrappingColumn: 2, cellSize: new go.Size(1, 1), spacing: new go.Size(6, 6) }),
    });
    this.palette.model = new go.GraphLinksModel([
      { key: 'ps', text: 'Inicio', category: 'Start' },
      { key: 'pe', text: 'Fin', category: 'End' },
      { key: 'pt', text: 'Tarea', category: '' },
      { key: 'pd', text: 'Decision', category: 'Decision' },
      { key: 'pp', text: 'Paralelo', category: 'Parallel' },
    ]);
  }

  // ── Drop handler: move node into the lane it was dropped on ──
  private finishDrop(e: any, grp: any): void {
    const ok = grp !== null
      ? grp.addMembers(grp.diagram.selection, true)
      : e.diagram.commandHandler.addTopLevelParts(e.diagram.selection, true);
    if (!ok) e.diagram.currentTool.doCancel();
    else {
      // Sync departamento property with lane name
      e.diagram.selection.each((part: any) => {
        if (part instanceof go.Node && grp && grp.data.category === 'Lane') {
          e.diagram.model.setDataProperty(part.data, 'departamento', grp.data.text);
        }
      });
      this.syncLanes();
      this.updateCounts();
      this.cdr.detectChanges();
    }
  }

  // ── Add a new swimlane ──
  addLane(): void {
    const name = prompt('Nombre del departamento / calle:');
    if (!name || !name.trim()) return;
    const poolKey = this.getPoolKey();
    if (!poolKey) return;
    const laneKey = 'lane_' + Date.now();
    this.diagram.startTransaction('add lane');
    (this.diagram.model as any).addNodeData({
      key: laneKey, text: name.trim(), isGroup: true,
      category: 'Lane', group: poolKey, size: '700 140',
    });
    this.diagram.commitTransaction('add lane');
    this.syncLanes();
    this.updateCounts();
    this.cdr.detectChanges();
  }

  private getPoolKey(): any {
    let poolKey: any = null;
    this.diagram.nodes.each((n: any) => {
      if (n.data.category === 'Pool') poolKey = n.data.key;
    });
    return poolKey;
  }

  // ── Move selected node to a different lane ──
  moveNodeToLane(laneName: string): void {
    if (!this.selectedNode) return;
    let targetLane: any = null;
    this.diagram.nodes.each((n: any) => {
      if (n.data.category === 'Lane' && n.data.text === laneName) targetLane = n;
    });
    if (!targetLane) return;
    const node = this.diagram.findNodeForKey(this.selectedNode.key);
    if (!node) return;
    this.diagram.startTransaction('move to lane');
    this.diagram.model.setDataProperty(node.data, 'group', targetLane.data.key);
    this.diagram.model.setDataProperty(node.data, 'departamento', laneName);
    this.diagram.commitTransaction('move to lane');
    if (this.selectedNode) this.selectedNode.departamento = laneName;
    this.cdr.detectChanges();
  }

  private syncLanes(): void {
    this.lanes = [];
    this.diagram.nodes.each((n: any) => {
      if (n.data.category === 'Lane') {
        this.lanes.push({ key: n.data.key, text: n.data.text, isGroup: true, category: 'Lane' });
      }
    });
    this.laneCount = this.lanes.length;
  }

  private onDiagramChanged(): void {
    this.updateCounts();
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => {
      if (this.politicaId) {
        this.wsService.enviarCambioDiagrama(this.politicaId, { modelo: this.diagram.model.toJson() });
      }
    }, 800);
  }

  private updateCounts(): void {
    if (!this.diagram) return;
    let nodes = 0, links = 0;
    this.diagram.nodes.each((n: any) => { if (n.data.category !== 'Lane' && n.data.category !== 'Pool') nodes++; });
    this.diagram.links.each(() => links++);
    this.nodeCount = nodes;
    this.linkCount = links;
    this.cdr.detectChanges();
  }

  applyNodeProps(): void {
    if (!this.selectedNode || !this.diagram) return;
    this.diagram.startTransaction('update props');
    const node = this.diagram.findNodeForKey(this.selectedNode.key);
    if (node) {
      this.diagram.model.setDataProperty(node.data, 'text', this.selectedNode.text);
      this.diagram.model.setDataProperty(node.data, 'departamento', this.selectedNode.departamento);
      this.diagram.model.setDataProperty(node.data, 'descripcion', this.selectedNode.descripcion);
      this.diagram.model.setDataProperty(node.data, 'tiempoLimiteHoras', this.selectedNode.tiempoLimiteHoras);
      this.diagram.model.setDataProperty(node.data, 'camposFormulario', this.selectedNode.camposFormulario);
    }
    this.diagram.commitTransaction('update props');
  }

  addCampo(): void {
    if (!this.selectedNode) return;
    if (!this.selectedNode.camposFormulario) this.selectedNode.camposFormulario = [];
    this.selectedNode.camposFormulario.push({ nombre: 'campo_' + Date.now(), tipo: 'text', etiqueta: 'Nuevo campo', requerido: false });
    this.applyNodeProps();
  }

  removeCampo(i: number): void {
    if (!this.selectedNode?.camposFormulario) return;
    this.selectedNode.camposFormulario.splice(i, 1);
    this.applyNodeProps();
  }

  zoomIn(): void { if (this.diagram) this.diagram.commandHandler.increaseZoom(); }
  zoomOut(): void { if (this.diagram) this.diagram.commandHandler.decreaseZoom(); }
  zoomFit(): void { if (this.diagram) this.diagram.zoomToFit(); }
  goBack(): void { this.router.navigate(['/admin']); }

  // ── Load / Save ───────────────────────────────────────────────────────────
  private loadPolitica(p: Politica): void {
    this.politicaNombre = p.nombre;
    this.politicaCategoria = p.categoria || '';
    this.politicaEstado = p.estado;
    if (p.nodos && p.nodos.length > 0) {
      this.loadNodosIntoDiagram(p.nodos);
    }
    this.addAiMsg('Politica "' + p.nombre + '" cargada. ' + p.nodos.length + ' nodos, estado: ' + p.estado);
  }

  private loadNodosIntoDiagram(nodos: Nodo[]): void {
    // Collect unique departments
    const depts = [...new Set(nodos.filter(n => n.departamento).map(n => n.departamento))];
    const poolKey = 'pool1';
    const nodeDataArray: any[] = [
      { key: poolKey, text: this.politicaNombre, isGroup: true, category: 'Pool' },
    ];
    // Create lanes for each department
    const laneMap: Record<string, string> = {};
    depts.forEach((dept, i) => {
      const lk = 'lane_' + i;
      laneMap[dept] = lk;
      nodeDataArray.push({ key: lk, text: dept, isGroup: true, category: 'Lane', group: poolKey, size: '700 160' });
    });
    // Default lane for nodes without department
    const defaultLaneKey = 'lane_default';
    const hasNoDept = nodos.some(n => !n.departamento && n.tipo !== 'START' && n.tipo !== 'END');
    const hasStartEnd = nodos.some(n => n.tipo === 'START' || n.tipo === 'END');
    if (hasNoDept || hasStartEnd) {
      nodeDataArray.push({ key: defaultLaneKey, text: 'General', isGroup: true, category: 'Lane', group: poolKey, size: '700 160' });
    }
    // Add nodes
    nodos.forEach(n => {
      const laneKey = n.departamento && laneMap[n.departamento] ? laneMap[n.departamento] : defaultLaneKey;
      nodeDataArray.push({
        key: n.id, text: n.nombre, category: this.tipoToCategory(n.tipo),
        group: laneKey, loc: n.posX + ' ' + n.posY,
        departamento: n.departamento || '',
        descripcion: n.descripcion || '',
        tiempoLimiteHoras: n.tiempoLimiteHoras,
        camposFormulario: n.camposFormulario || [],
      });
    });
    // Build links
    const linkDataArray: any[] = [];
    nodos.forEach(n => {
      (n.conexiones || []).forEach(targetId => {
        linkDataArray.push({ from: n.id, to: targetId });
      });
    });
    this.diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    this.diagram.model.nodeGroupKeyProperty = 'group';
    this.syncLanes();
    this.updateCounts();
    setTimeout(() => this.diagram.zoomToFit(), 100);
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
    this.saving = true;
    if (this.politicaId) {
      this.politicaService.update(this.politicaId, payload).subscribe({
        next: () => { this.saving = false; this.addAiMsg('Politica guardada correctamente.'); this.cdr.detectChanges(); },
        error: (e: any) => { this.saving = false; this.addAiMsg('Error al guardar: ' + (e.error?.error || e.message)); this.cdr.detectChanges(); },
      });
    } else {
      this.politicaService.create(payload).subscribe({
        next: (p) => { this.saving = false; this.politicaId = p.id; this.addAiMsg('Politica creada con ID: ' + p.id); this.cdr.detectChanges(); },
        error: (e: any) => { this.saving = false; this.addAiMsg('Error al crear: ' + (e.error?.error || e.message)); this.cdr.detectChanges(); },
      });
    }
  }

  activate(): void {
    if (!this.politicaId) { this.save(); return; }
    this.politicaService.activar(this.politicaId).subscribe({
      next: (p) => { this.politicaEstado = p.estado; this.addAiMsg('Politica activada correctamente.'); this.cdr.detectChanges(); },
      error: (e: any) => { this.addAiMsg('Error al activar: ' + (e.error?.error || e.message)); this.cdr.detectChanges(); },
    });
  }

  exportarUML(): void {
    if (!this.politicaId) return;
    this.exportandoUML = true;
    this.addAiMsg('Generando diagrama UML con IA...');
    this.aiService.generarPlantUML(this.politicaId).subscribe({
      next: (resp) => {
        this.exportandoUML = false;
        const blob = new Blob([resp.plantuml], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = this.politicaNombre.replace(/\s+/g, '_') + '_UML.puml'; a.click();
        URL.revokeObjectURL(url);
        this.addAiMsg('UML exportado. Abre el .puml en https://www.plantuml.com/plantuml/uml/');
        this.cdr.detectChanges();
      },
      error: () => { this.exportandoUML = false; this.addAiMsg('Error al generar UML.'); this.cdr.detectChanges(); }
    });
  }

  private extractNodos(): Nodo[] {
    const nodos: Nodo[] = [];
    this.diagram.nodes.each((node: any) => {
      const d = node.data;
      if (d.category === 'Lane' || d.category === 'Pool') return;
      const loc = go.Point.parse(d.loc || '0 0');
      nodos.push({
        id: String(d.key), nombre: d.text || '',
        descripcion: d.descripcion || '',
        tipo: this.categoryToTipo(d.category || ''),
        departamento: d.departamento || '',
        responsableId: '', tiempoLimiteHoras: d.tiempoLimiteHoras,
        posX: loc.x, posY: loc.y,
        conexiones: [], condiciones: {},
        camposFormulario: d.camposFormulario || [],
      });
    });
    this.diagram.links.each((link: any) => {
      const fromKey = String(link.data.from);
      const toKey = String(link.data.to);
      const nodo = nodos.find(n => n.id === fromKey);
      if (nodo && !nodo.conexiones.includes(toKey)) nodo.conexiones.push(toKey);
    });
    return nodos;
  }

  private tipoToCategory(tipo: string): string {
    return ({ START: 'Start', END: 'End', TASK: '', DECISION: 'Decision', PARALLEL: 'Parallel' } as any)[tipo] ?? '';
  }

  private categoryToTipo(cat: string): Nodo['tipo'] {
    return ({ Start: 'START', End: 'END', '': 'TASK', Decision: 'DECISION', Parallel: 'PARALLEL' } as any)[cat] ?? 'TASK';
  }

  private applyRemoteChange(cambio: any): void {
    if (cambio.editoresActivos !== undefined) { this.editoresActivos = cambio.editoresActivos; this.cdr.detectChanges(); }
    if (cambio.modelo && this.diagram) {
      try { this.diagram.model = go.Model.fromJson(cambio.modelo); this.syncLanes(); this.updateCounts(); } catch {}
    }
  }

  // ── AI Chat ───────────────────────────────────────────────────────────────
  sendChat(): void {
    const prompt = this.chatInput.trim();
    if (!prompt) return;
    this.chatMessages.push({ role: 'user', text: prompt });
    this.chatInput = '';
    this.aiLoading = true;
    this.cdr.detectChanges();
    this.aiService.procesarPromptDiagrama(prompt).subscribe({
      next: (resp) => { this.aiLoading = false; this.applyAiResponse(resp); this.cdr.detectChanges(); },
      error: () => { this.aiLoading = false; this.addAiMsg('Error al contactar la IA.'); this.cdr.detectChanges(); },
    });
  }

  sendQuickPrompt(prompt: string): void { this.chatInput = prompt; this.sendChat(); }

  private applyAiResponse(resp: string): void {
    const cleaned = resp.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    try {
      const js = cleaned.indexOf('{'); const je = cleaned.lastIndexOf('}');
      if (js === -1 || je === -1) { this.addAiMsg(resp); return; }
      const parsed = JSON.parse(cleaned.substring(js, je + 1));
      const nodos: any[] = parsed.nodos || parsed.nodes || [];
      const links: any[] = parsed.links || parsed.enlaces || [];
      const mensaje: string = parsed.mensaje || parsed.message || '';

      if (nodos.length > 0 || links.length > 0) {
        this.diagram.startTransaction('ai update');
        const poolKey = this.getPoolKey();
        // Get first lane as default target
        let defaultLaneKey: any = null;
        this.diagram.nodes.each((n: any) => { if (n.data.category === 'Lane' && !defaultLaneKey) defaultLaneKey = n.data.key; });

        nodos.forEach((n: any) => {
          const key = n.key ?? n.id;
          const existing = this.diagram.findNodeForKey(key);
          if (existing) {
            this.diagram.model.setDataProperty(existing.data, 'text', n.text || n.nombre || existing.data.text);
            if (n.departamento) this.diagram.model.setDataProperty(existing.data, 'departamento', n.departamento);
          } else {
            // Find or create lane for this node's department
            let laneKey = defaultLaneKey;
            if (n.departamento) {
              this.diagram.nodes.each((ln: any) => {
                if (ln.data.category === 'Lane' && ln.data.text === n.departamento) laneKey = ln.data.key;
              });
              // Create lane if not found
              if (laneKey === defaultLaneKey && n.departamento) {
                const newLaneKey = 'lane_' + Date.now();
                (this.diagram.model as any).addNodeData({ key: newLaneKey, text: n.departamento, isGroup: true, category: 'Lane', group: poolKey, size: '700 140' });
                laneKey = newLaneKey;
              }
            }
            const newKey = key ?? (Date.now() + Math.floor(Math.random() * 1000));
            (this.diagram.model as any).addNodeData({
              key: newKey, text: n.text || n.nombre || 'Nodo',
              category: n.category ?? this.tipoToCategory(n.tipo || 'TASK'),
              group: laneKey, departamento: n.departamento || '',
            });
          }
        });

        links.forEach((l: any) => {
          const from = l.from ?? l.desde; const to = l.to ?? l.hasta;
          if (from !== undefined && to !== undefined) {
            (this.diagram.model as any).addLinkData({ from, to, text: l.text || l.etiqueta || '' });
          }
        });

        this.diagram.commitTransaction('ai update');
        this.diagram.layoutDiagram(true);
        this.syncLanes();
        this.updateCounts();
        this.addAiMsg(mensaje || 'Cambios aplicados: ' + nodos.length + ' nodo(s), ' + links.length + ' enlace(s).');
      } else if (mensaje) {
        this.addAiMsg(mensaje);
      } else {
        this.addAiMsg(resp.length > 400 ? resp.substring(0, 400) + '...' : resp);
      }
    } catch {
      this.addAiMsg(resp.length > 400 ? resp.substring(0, 400) + '...' : resp);
    }
  }

  private addAiMsg(text: string): void {
    this.chatMessages.push({ role: 'ai', text });
    this.cdr.detectChanges();
  }

  // ── Voice ─────────────────────────────────────────────────────────────────
  toggleVoice(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this.addAiMsg('Tu navegador no soporta reconocimiento de voz.'); return; }
    if (this.isRecording) { this.recognition?.stop(); this.isRecording = false; return; }
    this.recognition = new SR();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      this.chatInput = event.results[0][0].transcript;
      this.isRecording = false; this.cdr.detectChanges(); this.sendChat();
    };
    this.recognition.onerror = () => { this.isRecording = false; this.cdr.detectChanges(); };
    this.recognition.onend = () => { this.isRecording = false; this.cdr.detectChanges(); };
    this.recognition.start();
    this.isRecording = true;
  }
}
