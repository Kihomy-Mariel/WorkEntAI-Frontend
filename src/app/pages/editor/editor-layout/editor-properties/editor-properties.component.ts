import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorStateService, EditorNodeData } from '../../editor-state.service';
import { CampoFormulario, Usuario } from '../../../../models/models';
import { UsuarioService } from '../../../../services/usuario/usuario.service';

@Component({
  selector: 'app-editor-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="props-panel glass-panel">
      <div class="panel-header">
        <h3 class="ptitle">Propiedades del Nodo</h3>
      </div>
      
      <div class="panel-body scroll-y">
        @if (state.selectedNode()) {
          <div class="prop-group">
            <label class="plabel">Nombre del Nodo</label>
            <input class="pinput" [ngModel]="state.selectedNode()?.text" (ngModelChange)="updateNode({text: $event})" placeholder="Ej. Revisión Técnica" />
          </div>

          @if (isEditableType(state.selectedNode()?.category)) {
            <div class="prop-group">
              <label class="plabel">Departamento Responsable</label>
              <select class="pinput" [ngModel]="state.selectedNode()?.departamento" (ngModelChange)="moveToLane($event)">
                <option value="">(Sin asignar)</option>
                @for (lane of state.lanes(); track lane.key) {
                  <option [value]="lane.text">{{ lane.text }}</option>
                }
              </select>
            </div>

            <div class="prop-group">
              <label class="plabel">Instrucciones para el Funcionario</label>
              <textarea class="pinput" [ngModel]="state.selectedNode()?.descripcion" (ngModelChange)="updateNode({descripcion: $event})" rows="3" placeholder="Describe qué debe hacer el funcionario en esta etapa..."></textarea>
            </div>

            @if (state.selectedNode()?.category === '' || state.selectedNode()?.category === 'Task') {
              <div class="prop-group">
                <label class="plabel">Tiempo Límite (Horas)</label>
                <input type="number" class="pinput" [ngModel]="state.selectedNode()?.tiempoLimiteHoras" (ngModelChange)="updateNode({tiempoLimiteHoras: $event})" min="0" placeholder="0 = Sin límite" />
              </div>

              <!-- Constructor de Formulario -->
              <div class="form-builder">
                <div class="fb-header">
                  <span class="plabel">Campos del Formulario</span>
                  <button class="btn-icon-sm" (click)="addCampo()" title="Agregar campo">+ Añadir</button>
                </div>
                
                @if (!state.selectedNode()?.camposFormulario?.length) {
                  <div class="empty-fields">No hay campos configurados. El funcionario solo verá las instrucciones.</div>
                }

                <div class="fields-list">
                  @for (campo of state.selectedNode()?.camposFormulario || []; track $index; let i = $index) {
                    <div class="field-card">
                      <div class="field-header">
                        <span class="field-num">{{ i + 1 }}</span>
                        <button class="btn-icon-xs text-danger" (click)="removeCampo(i)" title="Eliminar campo">×</button>
                      </div>
                      <div class="field-body">
                        <input class="finput label-input" [ngModel]="campo.etiqueta" (ngModelChange)="updateCampo(i, {etiqueta: $event})" placeholder="Etiqueta del campo (Ej. CI)" />
                        <div class="field-row">
                          <select class="finput type-select" [ngModel]="campo.tipo" (ngModelChange)="updateCampo(i, {tipo: $event})">
                            <option value="text">Texto Corto</option>
                            <option value="textarea">Párrafo</option>
                            <option value="number">Número</option>
                            <option value="select">Lista Opciones</option>
                            <option value="fecha">Fecha</option>
                            <option value="file">Archivo Adjunto</option>
                            <option value="boolean">Casilla Verificación (Sí/No)</option>
                            <option value="checkbox">Checklist (Múltiple)</option>
                            <option value="radio">Radio (Único)</option>
                            <option value="grid">Tabla Dinámica</option>
                          </select>
                          <label class="checkbox-label">
                            <input type="checkbox" [ngModel]="campo.requerido" (ngModelChange)="updateCampo(i, {requerido: $event})" />
                            <span>Requerido</span>
                          </label>
                        </div>
                        @if (campo.tipo === 'select' || campo.tipo === 'checkbox' || campo.tipo === 'radio') {
                          <div class="field-row mt-2">
                            <input class="finput" 
                                   [ngModel]="campo.opciones ? campo.opciones.join(',') : ''" 
                                   (ngModelChange)="updateOpciones(i, $event)" 
                                   placeholder="Opciones separadas por coma (ej: Opción 1, Opción 2)" />
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- RBAC Documental -->
              <div class="form-builder">
                <div class="fb-header">
                  <span class="plabel">Permisos Documentales (RBAC)</span>
                  <button class="btn-icon-sm" (click)="addPermisoDocumental('NUEVO_ROL')" title="Agregar Rol">+ Rol</button>
                </div>
                
                @if (!state.selectedNode()?.permisosDocumentales || !(state.selectedNode()?.permisosDocumentales | keyvalue)?.length) {
                  <div class="empty-fields">Sin permisos. El documento será de sólo lectura.</div>
                }

                <div class="fields-list">
                  @for (permiso of state.selectedNode()?.permisosDocumentales | keyvalue; track permiso.key) {
                    <div class="field-card">
                      <div class="field-header">
                        <select class="finput rol-select" [ngModel]="permiso.key" (ngModelChange)="renameRol(permiso.key, $event)">
                          <option [value]="permiso.key" hidden>{{ permiso.key }}</option>
                          <optgroup label="Roles Generales">
                            <option value="ROL:ADMIN">Rol: ADMIN</option>
                            <option value="ROL:FUNCIONARIO">Rol: FUNCIONARIO</option>
                            <option value="ROL:CLIENTE">Rol: CLIENTE</option>
                          </optgroup>
                          <optgroup label="Usuarios Específicos">
                            @for (u of usuarios; track u.id) {
                              <option [value]="'USER:' + u.id">{{ u.nombre }} ({{ u.email }})</option>
                            }
                          </optgroup>
                        </select>
                        <button class="btn-icon-xs text-danger" (click)="removePermisoDocumental(permiso.key)" title="Eliminar permisos">×</button>
                      </div>
                      <div class="field-body">
                        <div class="field-row">
                          <label class="checkbox-label">
                            <input type="checkbox" [ngModel]="permiso.value.lectura" (ngModelChange)="updatePermisoDocumental(permiso.key, {lectura: $event})" />
                            <span>Lectura</span>
                          </label>
                          <label class="checkbox-label">
                            <input type="checkbox" [ngModel]="permiso.value.escritura" (ngModelChange)="updatePermisoDocumental(permiso.key, {escritura: $event})" />
                            <span>Escritura</span>
                          </label>
                          <label class="checkbox-label">
                            <input type="checkbox" [ngModel]="permiso.value.subida" (ngModelChange)="updatePermisoDocumental(permiso.key, {subida: $event})" />
                            <span>Subida</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        } @else {
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--border-2); margin-bottom: 12px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <p>Selecciona un nodo en el lienzo para editar sus propiedades y formulario.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .props-panel { width: 280px; height: 100%; flex-shrink: 0; display: flex; flex-direction: column; border-right: 1px solid var(--border); z-index: 5; background: var(--bg); }
    .panel-header { padding: 14px 20px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.4); }
    .ptitle { font-size: 13px; font-weight: 700; color: var(--text); margin: 0; letter-spacing: 0.02em; }
    .panel-body { padding: 20px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
    .scroll-y { overflow-y: auto; }
    
    .prop-group { display: flex; flex-direction: column; gap: 6px; }
    .plabel { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .pinput { border: 1px solid var(--border-2); border-radius: 8px; padding: 8px 12px; font-size: 13px; background: var(--bg); color: var(--text); outline: none; font-family: inherit; transition: all 0.2s; width: 100%; box-sizing: border-box; }
    .pinput:focus { border-color: var(--primary); box-shadow: 0 0 0 3px hsl(216, 85%, 57%, 0.15); }
    
    .form-builder { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; border-top: 1px solid var(--border); padding-top: 20px; }
    .fb-header { display: flex; justify-content: space-between; align-items: center; }
    .btn-icon-sm { background: hsl(216, 85%, 57%, 0.1); color: var(--primary); border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-icon-sm:hover { background: hsl(216, 85%, 57%, 0.2); }
    
    .empty-fields { padding: 16px; background: var(--bg-2); border-radius: 8px; font-size: 12px; color: var(--text-muted); text-align: center; border: 1px dashed var(--border-2); }
    
    .fields-list { display: flex; flex-direction: column; gap: 12px; }
    .field-card { background: var(--bg); border: 1px solid var(--border-2); border-radius: 10px; overflow: hidden; transition: all 0.2s; }
    .field-card:hover { border-color: var(--border); box-shadow: var(--shadow); }
    .field-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--bg-2); border-bottom: 1px solid var(--border-2); }
    .field-num { font-size: 10px; font-weight: 700; color: var(--text-faint); }
    .btn-icon-xs { background: transparent; border: none; font-size: 14px; line-height: 1; cursor: pointer; padding: 0 4px; }
    .text-danger { color: var(--danger); opacity: 0.6; }
    .text-danger:hover { opacity: 1; }
    
    .field-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .finput { border: 1px solid var(--border-2); border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none; background: #fff; width: 100%; box-sizing: border-box; }
    .finput:focus { border-color: var(--primary); }
    .label-input { font-weight: 500; }
    .field-row { display: flex; gap: 8px; align-items: center; }
    .mt-2 { margin-top: 6px; }
    .type-select { flex: 1; }
    .checkbox-label { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--text-muted); cursor: pointer; }
    .checkbox-label input { accent-color: var(--primary); width: 14px; height: 14px; }
    
    .empty-state { text-align: center; color: var(--text-muted); padding: 40px 10px; }
    .empty-state p { font-size: 13px; line-height: 1.5; margin: 0; }
    
    [data-theme="dark"] .finput { background: var(--bg); color: var(--text); }
    .rol-select { font-weight: 600; font-size: 11px; padding: 4px 6px; border: 1px solid var(--border-2); border-radius: 6px; width: 180px; }
  `]
})
export class EditorPropertiesComponent implements OnInit {
  state = inject(EditorStateService);
  usuarioService = inject(UsuarioService);
  usuarios: Usuario[] = [];

  ngOnInit() {
    this.usuarioService.getAll().subscribe({
      next: (users) => this.usuarios = users,
      error: (err) => console.error('Error cargando usuarios', err)
    });
  }

  isEditableType(category?: string): boolean {
    return category !== 'Start' && category !== 'End';
  }

  updateNode(updates: Partial<EditorNodeData>) {
    const current = this.state.selectedNode();
    if (current) {
      this.state.selectedNode.set({ ...current, ...updates });
      this.state.triggerApplyProps.update((v: number) => v + 1);
    }
  }

  moveToLane(laneName: string) {
    this.updateNode({ departamento: laneName });
    this.state.triggerMoveToLane.set(laneName);
  }

  addCampo() {
    const current = this.state.selectedNode();
    if (!current) return;
    const campos = current.camposFormulario ? [...current.camposFormulario] : [];
    campos.push({ nombre: 'campo_' + Date.now(), tipo: 'text', etiqueta: 'Nuevo Campo', requerido: false });
    this.updateNode({ camposFormulario: campos });
  }

  updateCampo(index: number, updates: Partial<CampoFormulario>) {
    const current = this.state.selectedNode();
    if (!current || !current.camposFormulario) return;
    const campos = [...current.camposFormulario];
    campos[index] = { ...campos[index], ...updates };
    this.updateNode({ camposFormulario: campos });
  }

  updateOpciones(index: number, opcionesStr: string) {
    const opciones = opcionesStr.split(',').map(o => o.trim()).filter(o => o.length > 0);
    this.updateCampo(index, { opciones });
  }

  removeCampo(index: number) {
    const current = this.state.selectedNode();
    if (!current || !current.camposFormulario) return;
    const campos = [...current.camposFormulario];
    campos.splice(index, 1);
    this.updateNode({ camposFormulario: campos });
  }

  addPermisoDocumental(rolInicial: string) {
    const current = this.state.selectedNode();
    if (!current) return;
    const permisos = current.permisosDocumentales ? { ...current.permisosDocumentales } : {};
    
    // Buscar un nombre único
    let nuevoRol = 'ROL:FUNCIONARIO';
    let counter = 1;
    while (permisos[nuevoRol]) {
      nuevoRol = `ROL:FUNCIONARIO_${counter}`;
      counter++;
    }

    permisos[nuevoRol] = { lectura: true, escritura: false, subida: false };
    this.updateNode({ permisosDocumentales: permisos });
  }

  updatePermisoDocumental(rol: string, updates: Partial<{lectura: boolean; escritura: boolean; subida: boolean;}>) {
    const current = this.state.selectedNode();
    if (!current || !current.permisosDocumentales) return;
    const permisos = { ...current.permisosDocumentales };
    if (permisos[rol]) {
      permisos[rol] = { ...permisos[rol], ...updates };
      this.updateNode({ permisosDocumentales: permisos });
    }
  }

  renameRol(oldRol: string, newRol: string) {
    const current = this.state.selectedNode();
    if (!current || !current.permisosDocumentales || !newRol.trim() || oldRol === newRol.trim()) return;
    const permisos = { ...current.permisosDocumentales };
    
    if (permisos[newRol.trim()]) return; // Ya existe

    // Swap key
    permisos[newRol.trim()] = permisos[oldRol];
    delete permisos[oldRol];
    
    this.updateNode({ permisosDocumentales: permisos });
  }

  removePermisoDocumental(rol: string) {
    const current = this.state.selectedNode();
    if (!current || !current.permisosDocumentales) return;
    const permisos = { ...current.permisosDocumentales };
    delete permisos[rol];
    this.updateNode({ permisosDocumentales: permisos });
  }
}
