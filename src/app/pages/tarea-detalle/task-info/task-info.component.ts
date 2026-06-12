import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Tarea, Tramite } from '../../../models/models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task-info',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="glass-card">
      <h3 class="section-title">📋 Información de la Tarea</h3>
      <div class="info-grid-2">
        <div class="info-item">
          <span class="info-label">Asignado a</span>
          <span class="info-value">{{ tarea?.nombreFuncionario || 'Sin asignar' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Prioridad</span>
          <span class="badge"
            [class.badge-nuevo]="tarea?.prioridad === 'ALTA'"
            [class.badge-proceso]="tarea?.prioridad === 'MEDIA'"
            [class.badge-completado]="tarea?.prioridad === 'BAJA'">
            {{ tarea?.prioridad }}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Fecha asignación</span>
          <span class="info-value mono">{{ tarea?.fechaAsignacion | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
        @if (tarea?.fechaCompletado) {
          <div class="info-item">
            <span class="info-label">Fecha completado</span>
            <span class="info-value mono">{{ tarea!.fechaCompletado | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
        }
      </div>
      @if (tarea?.instrucciones) {
        <div class="instrucciones">
          <p class="info-label">Instrucciones</p>
          <p class="instrucciones-texto">{{ tarea!.instrucciones }}</p>
        </div>
      }
    </div>

    @if (tramite) {
      <div class="glass-card mt-16">
        <h3 class="section-title">🔗 Trámite Relacionado</h3>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">Referencia</span>
            <span class="info-value mono">{{ tramite.numeroReferencia }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Cliente</span>
            <span class="info-value">{{ tramite.nombreCliente }}</span>
          </div>
        </div>
        <button class="btn-outline w-full mt-12" (click)="viewTramite.emit(tramite.id)">
          Ver trámite completo →
        </button>
      </div>
    }
  `,
  styles: [`
    .glass-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; box-shadow: var(--shadow); }
    .section-title { font-size: 14px; font-weight: 700; margin: 0 0 16px; color: var(--text); display: flex; align-items: center; gap: 8px; }
    .info-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .info-value { font-size: 13px; font-weight: 500; color: var(--text); }
    .info-list { display: flex; flex-direction: column; gap: 12px; }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    .mt-16 { margin-top: 16px; }
    .mt-12 { margin-top: 12px; }
    .w-full { width: 100%; }
    .instrucciones { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-2); }
    .instrucciones-texto { font-size: 13px; color: var(--text); line-height: 1.6; margin: 6px 0 0; background: var(--bg-2); padding: 12px; border-radius: 8px; }
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; display: inline-flex; width: fit-content; }
    .badge-nuevo { background: hsl(355,80%,55%,0.1); color: var(--danger); }
    .badge-proceso { background: hsl(20,89%,48%,0.1); color: var(--warning); }
    .badge-completado { background: hsl(142,60%,38%,0.1); color: var(--success); }
    .btn-outline { padding: 8px 16px; background: transparent; border: 1px solid var(--border-2); color: var(--text); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
    .btn-outline:hover { border-color: var(--primary); color: var(--primary); background: hsl(216, 85%, 57%, 0.05); }
  `]
})
export class TaskInfoComponent {
  @Input() tarea: Tarea | null = null;
  @Input() tramite: Tramite | null = null;
  @Output() viewTramite = new EventEmitter<string>();
}
