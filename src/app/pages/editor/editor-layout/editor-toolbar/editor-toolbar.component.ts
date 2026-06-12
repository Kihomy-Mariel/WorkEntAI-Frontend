import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EditorStateService } from '../../editor-state.service';

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toolbar glass-panel">
      <button class="btn-icon" (click)="goBack()" title="Volver al panel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      </button>
      
      <div class="tsep"></div>
      
      <div class="title-group">
        <input class="tinput title-input" [ngModel]="state.politicaNombre()" (ngModelChange)="state.politicaNombre.set($event)" placeholder="Nombre de la política" />
        <input class="tinput sm cat-input" [ngModel]="state.politicaCategoria()" (ngModelChange)="state.politicaCategoria.set($event)" placeholder="Categoría" />
      </div>

      <div class="tsep"></div>
      
      <div class="metrics">
        <span class="badge badge-info">{{ state.laneCount() }} calles</span>
        <span class="badge badge-info">{{ state.nodeCount() }} nodos</span>
        <span class="badge badge-info">{{ state.linkCount() }} enlaces</span>
        @if (state.editoresActivos() > 0) { 
          <span class="badge badge-success pulse"><span class="dot"></span> {{ state.editoresActivos() }} editor(es)</span> 
        }
      </div>

      <div class="spacer"></div>

      <div class="actions-group">
        <div class="toggle-group">
          <button class="btn-icon" [class.active]="state.elementsOpen()" (click)="toggleElements()" title="Alternar Elementos">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </button>
          <button class="btn-icon" [class.active]="state.propertiesOpen()" (click)="toggleProperties()" title="Alternar Propiedades">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>
          </button>
          <button class="btn-icon" [class.active]="state.aiSidebarOpen()" (click)="toggleAiSidebar()" title="Panel IA">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2z"/><path d="M19 14v4h-2M5 14v4h2"/><path d="M12 14v8"/><path d="M8 10h8l2 4H6l2-4z"/></svg>
          </button>
        </div>

        <div class="tsep"></div>

        <button class="btn-lane" (click)="addLane()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Calle
        </button>
        
        <div class="zoom-group">
          <button class="btn-icon" (click)="zoomFit()" title="Ajustar a pantalla">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14v6h6M20 10V4h-6M10 20H4v-6M14 4h6v6"/></svg>
          </button>
          <button class="btn-icon" (click)="zoomIn()" title="Acercar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6M11 8v6"/></svg>
          </button>
          <button class="btn-icon" (click)="zoomOut()" title="Alejar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
          </button>
          <div class="tsep" style="height: 16px; margin: 0 2px;"></div>
          <button class="btn-icon" style="color: #ef4444;" (click)="deleteSelected()" title="Eliminar seleccionado" [disabled]="!state.selectedNode()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>

        <div class="tsep"></div>

        <button class="btn-outline" (click)="exportarUML()">UML</button>
        <button class="btn-outline" (click)="save()" [disabled]="state.saving()">
          @if (state.saving()) {
            <span class="spinner-sm"></span>
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          }
          Guardar
        </button>
        <button class="btn-primary" (click)="activate()" [disabled]="state.politicaEstado() === 'ACTIVA'">
          {{ state.politicaEstado() === 'ACTIVA' ? 'Activa' : 'Activar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0; z-index: 10;
    }
    .title-group { display: flex; gap: 8px; align-items: center; }
    .tinput {
      border: 1px solid transparent; background: transparent;
      padding: 6px 10px; font-size: 14px; font-weight: 600;
      color: var(--text); border-radius: 6px; outline: none;
      transition: all 0.2s;
    }
    .tinput:hover, .tinput:focus { background: var(--bg-2); border-color: var(--border-2); }
    .title-input { width: 200px; }
    .cat-input { width: 120px; font-weight: 500; font-size: 13px; color: var(--text-muted); }
    .tsep { width: 1px; height: 24px; background: var(--border); margin: 0 4px; }
    
    .metrics { display: flex; gap: 8px; align-items: center; }
    .badge-info { background: hsl(216, 85%, 57%, 0.1); color: var(--primary); }
    .badge-success { background: hsl(142, 71%, 45%, 0.1); color: var(--success); }
    .pulse { position: relative; }
    .dot { width: 6px; height: 6px; background: var(--success); border-radius: 50%; display: inline-block; margin-right: 4px; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
    
    .spacer { flex: 1; }
    .actions-group { display: flex; align-items: center; gap: 8px; }
    
    .btn-icon {
      background: transparent; border: 1px solid transparent; border-radius: 8px;
      padding: 6px; cursor: pointer; color: var(--text-muted);
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .btn-icon:hover:not(:disabled) { background: var(--bg-2); color: var(--text); }
    .btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-icon.active { background: var(--primary); color: white; }
    
    .toggle-group { display: flex; background: var(--bg-2); border-radius: 8px; padding: 2px; }
    .zoom-group { display: flex; align-items: center; background: var(--bg-2); border-radius: 8px; padding: 2px; }
    .zoom-group .btn-icon, .toggle-group .btn-icon { border-radius: 6px; }
    .zoom-group .btn-icon:hover:not(.active):not(:disabled), .toggle-group .btn-icon:hover:not(.active):not(:disabled) { background: var(--card); box-shadow: var(--shadow); }

    .btn-lane {
      display: flex; align-items: center; gap: 6px;
      background: hsl(142, 71%, 45%, 0.1); color: var(--success);
      border: 1px solid hsl(142, 71%, 45%, 0.2); border-radius: 8px;
      padding: 7px 14px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;
    }
    .btn-lane:hover { background: hsl(142, 71%, 45%, 0.2); }
    
    .spinner-sm {
      width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor;
      border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block;
    }
  `]
})
export class EditorToolbarComponent {
  state = inject(EditorStateService);
  private router = inject(Router);

  goBack() { this.router.navigate(['/admin']); }
  
  toggleElements() {
    this.state.elementsOpen.set(!this.state.elementsOpen());
  }

  toggleProperties() {
    this.state.propertiesOpen.set(!this.state.propertiesOpen());
  }

  toggleAiSidebar() {
    this.state.aiSidebarOpen.set(!this.state.aiSidebarOpen());
  }

  addLane() { this.state.triggerAddLane.update((v: number) => v + 1); }
  zoomFit() { this.state.triggerZoomFit.update((v: number) => v + 1); }
  zoomIn() { this.state.triggerZoomIn.update((v: number) => v + 1); }
  zoomOut() { this.state.triggerZoomOut.update((v: number) => v + 1); }
  deleteSelected() { this.state.triggerDeleteNode.update((v: number) => v + 1); }
  save() { this.state.triggerSave.update((v: number) => v + 1); }
  activate() { this.state.triggerActivate.update((v: number) => v + 1); }
  exportarUML() { this.state.triggerUmlExport.update((v: number) => v + 1); }
}
