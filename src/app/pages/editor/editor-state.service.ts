import { Injectable, signal } from '@angular/core';
import { Politica, Nodo, CampoFormulario } from '../../models/models';
import { PoliticaService } from '../../services/politica/politica.service';

export interface EditorNodeData {
  key: any;
  text: string;
  category: string;
  group?: any;
  departamento?: string;
  descripcion?: string;
  tiempoLimiteHoras?: number;
  camposFormulario?: CampoFormulario[];
  permisosDocumentales?: Record<string, { lectura: boolean; escritura: boolean; subida: boolean; }>;
  loc?: string;
}

@Injectable({ providedIn: 'root' })
export class EditorStateService {
  politicaId = signal<string | null>(null);
  politicaNombre = signal<string>('Nueva Política');
  politicaCategoria = signal<string>('');
  politicaEstado = signal<'BORRADOR' | 'ACTIVA' | 'INACTIVA'>('BORRADOR');
  
  nodeCount = signal<number>(0);
  linkCount = signal<number>(0);
  laneCount = signal<number>(0);
  editoresActivos = signal<number>(0);
  saving = signal<boolean>(false);
  
  selectedNode = signal<EditorNodeData | null>(null);
  lanes = signal<{key: any, text: string}[]>([]);
  
  // UI States
  propertiesOpen = signal<boolean>(true);
  aiSidebarOpen = signal<boolean>(false);
  elementsOpen = signal<boolean>(true);

  // Triggers for GoJS canvas
  triggerSave = signal<number>(0);
  triggerActivate = signal<number>(0);
  triggerZoomIn = signal<number>(0);
  triggerZoomOut = signal<number>(0);
  triggerZoomFit = signal<number>(0);
  triggerAddLane = signal<number>(0);
  triggerApplyProps = signal<number>(0);
  triggerMoveToLane = signal<string | null>(null);
  triggerUmlExport = signal<number>(0);
  triggerDeleteNode = signal<number>(0);

  // AI Triggers
  triggerAiDiagramUpdate = signal<any>(null); // Pasa la respuesta JSON de la IA para dibujar

  constructor(private politicaService: PoliticaService) {}

  reset() {
    this.politicaId.set(null);
    this.politicaNombre.set('Nueva Política');
    this.politicaCategoria.set('');
    this.politicaEstado.set('BORRADOR');
    this.nodeCount.set(0);
    this.linkCount.set(0);
    this.laneCount.set(0);
    this.selectedNode.set(null);
    this.lanes.set([]);
    this.propertiesOpen.set(true);
    this.aiSidebarOpen.set(false);
    
    // Resetear triggers para que no se disparen accidentalmente al volver a entrar
    this.triggerSave.set(0);
    this.triggerActivate.set(0);
    this.triggerZoomIn.set(0);
    this.triggerZoomOut.set(0);
    this.triggerZoomFit.set(0);
    this.triggerAddLane.set(0);
    this.triggerApplyProps.set(0);
    this.triggerMoveToLane.set(null);
    this.triggerUmlExport.set(0);
    this.triggerDeleteNode.set(0);
    this.triggerAiDiagramUpdate.set(null);
  }
}
