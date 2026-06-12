import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-panel glass-panel">
      <div class="ai-header">
        <div class="ai-icon">✨</div>
        <div>
          <h4 class="ai-title">Asistente de Autocompletado</h4>
          <p class="ai-sub">Sube un documento y extraeré los datos</p>
        </div>
      </div>
      
      <div class="ai-body">
        <div class="file-drop" (click)="fileInput.click()">
          <input type="file" #fileInput hidden (change)="onFileSelected($event)" accept=".txt,.pdf" />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          <span>Seleccionar documento</span>
        </div>
        
        <div class="or-divider">o pega el texto</div>
        
        <textarea class="ai-textarea" [(ngModel)]="textoDocumento" rows="4" placeholder="Ej: El informe pericial concluye que el vehículo con placa XYZ-123..."></textarea>
        
        <button class="btn-ai" (click)="onExtract()" [disabled]="loading || (!textoDocumento.trim() && !fileSelected)">
          @if (loading) { <span class="spinner-sm"></span> Extrayendo... }
          @else { Extraer Datos al Formulario }
        </button>
        
        @if (error) { <div class="ai-error">{{ error }}</div> }
      </div>
    </div>
  `,
  styles: [`
    .ai-panel { background: linear-gradient(180deg, hsl(282,69%,45%,0.05) 0%, var(--card) 100%); border: 1px solid hsl(282,69%,45%,0.2); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow); }
    .ai-header { padding: 16px; border-bottom: 1px solid var(--border-2); display: flex; align-items: center; gap: 12px; }
    .ai-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--primary), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
    .ai-title { margin: 0; font-size: 13px; font-weight: 700; color: var(--text); }
    .ai-sub { margin: 2px 0 0; font-size: 11px; color: var(--text-muted); }
    
    .ai-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    
    .file-drop { border: 1px dashed var(--border-2); border-radius: 10px; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: var(--bg-2); }
    .file-drop:hover { border-color: var(--primary); color: var(--primary); background: hsl(216, 85%, 57%, 0.05); }
    
    .or-divider { text-align: center; font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.1em; margin: 4px 0; position: relative; }
    .or-divider::before, .or-divider::after { content: ''; position: absolute; top: 50%; width: 35%; height: 1px; background: var(--border-2); }
    .or-divider::before { left: 0; } .or-divider::after { right: 0; }
    
    .ai-textarea { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid var(--border-2); border-radius: 10px; font-size: 12px; color: var(--text); background: var(--bg); font-family: inherit; outline: none; transition: all 0.2s; resize: vertical; }
    .ai-textarea:focus { border-color: var(--purple); box-shadow: 0 0 0 3px hsl(282, 69%, 45%, 0.1); }
    
    .btn-ai { background: linear-gradient(135deg, var(--purple), var(--primary)); color: white; border: none; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; }
    .btn-ai:hover:not(:disabled) { opacity: 0.9; }
    .btn-ai:disabled { opacity: 0.6; cursor: not-allowed; filter: grayscale(1); }
    
    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .ai-error { font-size: 11px; color: var(--danger); background: hsl(355, 88%, 64%, 0.1); padding: 8px; border-radius: 6px; text-align: center; }
  `]
})
export class TaskAiAssistantComponent {
  @Input() loading = false;
  @Input() error = '';
  @Output() extract = new EventEmitter<{texto: string, file: File | null}>();
  
  textoDocumento = '';
  fileSelected: File | null = null;
  
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileSelected = file;
      this.textoDocumento = `(Documento adjunto: ${file.name})`;
    }
  }

  onExtract() {
    this.extract.emit({ texto: this.textoDocumento, file: this.fileSelected });
  }
}
