import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarea } from '../../../models/models';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-container">
      @if (camposFormulario.length > 0) {
        @for (campo of camposFormulario; track campo.nombre) {
          <div class="form-group">
            <label class="form-label">
              {{ campo.etiqueta || campo.nombre }}
              @if (campo.requerido) { <span class="required">*</span> }
            </label>

            @if (campo.tipo === 'textarea') {
              <textarea class="finput" [(ngModel)]="formularioDatos[campo.nombre]"
                [placeholder]="'Ingresa ' + (campo.etiqueta || campo.nombre)"
                rows="3" [disabled]="disabled"></textarea>
                
            } @else if (campo.tipo === 'boolean') {
              <div class="radio-cards">
                <label class="radio-card" [class.selected]="formularioDatos[campo.nombre] === 'true'">
                  <input type="radio" [name]="campo.nombre" value="true" [(ngModel)]="formularioDatos[campo.nombre]" [disabled]="disabled" />
                  <span class="rc-icon">✅</span> <span class="rc-text">Aprobado</span>
                </label>
                <label class="radio-card reject" [class.selected]="formularioDatos[campo.nombre] === 'false'">
                  <input type="radio" [name]="campo.nombre" value="false" [(ngModel)]="formularioDatos[campo.nombre]" [disabled]="disabled" />
                  <span class="rc-icon">❌</span> <span class="rc-text">Rechazado</span>
                </label>
              </div>

            } @else if (campo.tipo === 'select') {
              <div class="select-wrapper">
                <select class="finput" [(ngModel)]="formularioDatos[campo.nombre]" [disabled]="disabled">
                  <option value="">— Selecciona una opción —</option>
                  @for (op of (campo.opciones || []); track op) {
                    <option [value]="op">{{ op }}</option>
                  }
                </select>
              </div>

            } @else if (campo.tipo === 'radio') {
              <div class="radio-group">
                @for (op of (campo.opciones || []); track op) {
                  <label class="radio-item" [class.selected]="formularioDatos[campo.nombre] === op" [class.disabled]="disabled">
                    <input type="radio" 
                      [name]="campo.nombre" 
                      [value]="op" 
                      [(ngModel)]="formularioDatos[campo.nombre]" 
                      [disabled]="disabled" />
                    <span class="rd-text">{{ op }}</span>
                  </label>
                }
              </div>

            } @else if (campo.tipo === 'checkbox') {
              <div class="checkbox-group">
                @for (op of (campo.opciones || []); track op) {
                  <label class="checkbox-item" [class.disabled]="disabled">
                    <input type="checkbox" 
                      [value]="op" 
                      [disabled]="disabled"
                      [checked]="isChecked(campo.nombre, op)"
                      (change)="toggleCheckbox(campo.nombre, op, $event)" />
                    <span class="chk-text">{{ op }}</span>
                  </label>
                }
              </div>

            } @else if (campo.tipo === 'grid') {
              <div class="grid-table">
                <div class="grid-header">
                  <div class="gh-col">Descripción</div>
                  <div class="gh-col">Valor</div>
                  @if (!disabled) { <div class="gh-col-action"></div> }
                </div>
                @for (fila of getGridRows(campo.nombre); track $index; let i = $index) {
                  <div class="grid-row">
                    <div class="gr-col">
                      <input class="finput grid-input" [(ngModel)]="fila.descripcion" [disabled]="disabled" placeholder="Descripción" (ngModelChange)="updateGrid(campo.nombre)" />
                    </div>
                    <div class="gr-col">
                      <input class="finput grid-input" [(ngModel)]="fila.valor" [disabled]="disabled" placeholder="Valor" (ngModelChange)="updateGrid(campo.nombre)" />
                    </div>
                    @if (!disabled) {
                      <div class="gr-col-action">
                        <button class="btn-icon-xs text-danger" (click)="removeGridRow(campo.nombre, i)">×</button>
                      </div>
                    }
                  </div>
                }
                @if (!disabled) {
                  <button class="btn-text-sm" (click)="addGridRow(campo.nombre)">+ Añadir fila</button>
                }
              </div>

            } @else if (campo.tipo === 'file') {
              <!-- Drag and drop zone aesthetic -->
              <div class="file-drop-zone" [class.disabled]="disabled">
                <input type="file" class="file-input-hidden" [disabled]="disabled" />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <div class="fdz-text">
                  <span class="font-bold">Arrastra un archivo aquí</span> o haz clic para subir
                </div>
                <div class="fdz-sub">Soporta PDF, JPG, PNG (máx. 10MB)</div>
              </div>
            } @else {
              <input [type]="campo.tipo === 'number' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'" 
                class="finput" [(ngModel)]="formularioDatos[campo.nombre]"
                [placeholder]="'Ingresa ' + (campo.etiqueta || campo.nombre)"
                [disabled]="disabled" />
            }
          </div>
        }
      } @else {
        <div class="empty-state">
          No hay campos adicionales configurados para esta tarea.
        </div>
      }

      @if (!disabled) {
        <div class="form-group mt-16">
          <label class="form-label">Observaciones (opcional)</label>
          <textarea class="finput" [(ngModel)]="formularioDatos['observacion']"
            rows="2" placeholder="Añade notas adicionales..."></textarea>
        </div>
      }
    </div>
  `,
  styles: [`
    .form-container { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { font-size: 12px; font-weight: 600; color: var(--text); letter-spacing: 0.02em; }
    .required { color: var(--danger); }
    
    .finput {
      width: 100%; box-sizing: border-box; padding: 10px 14px;
      background: var(--bg-2); border: 1px solid var(--border-2);
      border-radius: 10px; font-size: 13px; color: var(--text);
      font-family: inherit; transition: all 0.2s; outline: none;
    }
    .finput:focus { background: var(--card); border-color: var(--primary); box-shadow: 0 0 0 3px hsl(216, 85%, 57%, 0.15); }
    .finput:disabled { opacity: 0.7; cursor: not-allowed; }
    
    .select-wrapper { position: relative; }
    .select-wrapper::after {
      content: "▼"; position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      font-size: 10px; color: var(--text-muted); pointer-events: none;
    }
    
    .radio-cards { display: flex; gap: 12px; }
    .radio-card {
      flex: 1; display: flex; align-items: center; gap: 10px;
      padding: 12px; border: 1px solid var(--border-2); border-radius: 10px;
      cursor: pointer; transition: all 0.2s; background: var(--card);
    }
    .radio-card input { display: none; }
    .radio-card:hover:not(.selected) { border-color: var(--border); background: var(--bg-2); }
    .radio-card.selected { border-color: var(--success); background: hsl(142, 71%, 45%, 0.08); box-shadow: 0 4px 12px hsl(142, 71%, 45%, 0.1); }
    .radio-card.reject.selected { border-color: var(--danger); background: hsl(355, 88%, 64%, 0.08); box-shadow: 0 4px 12px hsl(355, 88%, 64%, 0.1); }
    .rc-icon { font-size: 16px; }
    .rc-text { font-size: 13px; font-weight: 600; color: var(--text); }
    
    .radio-group, .checkbox-group { display: flex; flex-direction: column; gap: 8px; }
    .radio-item, .checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text); cursor: pointer; padding: 4px 0; }
    .radio-item.disabled, .checkbox-item.disabled { opacity: 0.6; cursor: not-allowed; }
    .radio-item input, .checkbox-item input { accent-color: var(--primary); width: 16px; height: 16px; }
    
    .grid-table { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--border-2); border-radius: 10px; padding: 12px; background: var(--bg-2); }
    .grid-header { display: flex; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border); font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .gh-col { flex: 1; }
    .gh-col-action { width: 24px; }
    .grid-row { display: flex; gap: 8px; align-items: center; }
    .gr-col { flex: 1; }
    .gr-col-action { width: 24px; display: flex; justify-content: center; }
    .grid-input { padding: 8px; font-size: 12px; }
    .btn-text-sm { align-self: flex-start; background: none; border: none; color: var(--primary); font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 0; margin-top: 4px; }
    .btn-text-sm:hover { text-decoration: underline; }
    .btn-icon-xs { background: none; border: none; font-size: 16px; cursor: pointer; padding: 0; }
    .text-danger { color: var(--danger); opacity: 0.6; }
    .text-danger:hover { opacity: 1; }
    
    .file-drop-zone {
      border: 2px dashed var(--border-2); border-radius: 12px; padding: 30px 20px;
      text-align: center; background: var(--bg-2); cursor: pointer;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      transition: all 0.2s; color: var(--text-muted); position: relative;
    }
    .file-drop-zone:hover:not(.disabled) { border-color: var(--primary); color: var(--primary); background: hsl(216, 85%, 57%, 0.02); }
    .file-input-hidden { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
    .fdz-text { font-size: 13px; color: var(--text); }
    .font-bold { font-weight: 600; }
    .fdz-sub { font-size: 11px; color: var(--text-faint); }
    .file-drop-zone.disabled { opacity: 0.6; cursor: not-allowed; }
    
    .empty-state { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; border: 1px dashed var(--border-2); border-radius: 10px; }
    .mt-16 { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 16px; }
  `]
})
export class TaskFormComponent implements OnInit {
  @Input() camposFormulario: any[] = [];
  @Input() formularioDatos: any = {};
  @Input() disabled: boolean = false;
  @Output() formularioDatosChange = new EventEmitter<any>();

  ngOnInit() {
    if (!this.formularioDatos) this.formularioDatos = {};
    for (const c of this.camposFormulario) {
      if (c.tipo === 'checkbox' && !this.formularioDatos[c.nombre]) {
        this.formularioDatos[c.nombre] = [];
      }
      if (c.tipo === 'grid' && !this.formularioDatos[c.nombre]) {
        this.formularioDatos[c.nombre] = [];
      }
    }
  }

  isChecked(campoName: string, option: string): boolean {
    const values = this.formularioDatos[campoName] || [];
    return values.includes(option);
  }

  toggleCheckbox(campoName: string, option: string, event: any) {
    let values = this.formularioDatos[campoName] || [];
    if (event.target.checked) {
      if (!values.includes(option)) values.push(option);
    } else {
      values = values.filter((v: string) => v !== option);
    }
    this.formularioDatos[campoName] = values;
    this.formularioDatosChange.emit(this.formularioDatos);
  }

  getGridRows(campoName: string): any[] {
    if (!this.formularioDatos[campoName]) {
      this.formularioDatos[campoName] = [];
    }
    return this.formularioDatos[campoName];
  }

  addGridRow(campoName: string) {
    const rows = this.getGridRows(campoName);
    rows.push({ descripcion: '', valor: '' });
    this.formularioDatos[campoName] = rows;
    this.formularioDatosChange.emit(this.formularioDatos);
  }

  removeGridRow(campoName: string, index: number) {
    const rows = this.getGridRows(campoName);
    rows.splice(index, 1);
    this.formularioDatos[campoName] = rows;
    this.formularioDatosChange.emit(this.formularioDatos);
  }

  updateGrid(campoName: string) {
    this.formularioDatosChange.emit(this.formularioDatos);
  }
}
