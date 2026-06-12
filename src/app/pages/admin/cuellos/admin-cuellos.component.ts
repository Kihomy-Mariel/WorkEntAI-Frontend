import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent, NavItem, ADMIN_NAV_ITEMS } from '../../../components/sidebar/sidebar.component';
import { PoliticaService } from '../../../services/politica/politica.service';
import { AIService } from '../../../services/ai/ai.service';
import { Politica } from '../../../models/models';

export interface AIResult {
  totalTareas: number;
  promedioMinutos: number;
  cuellos: { nodo: string; excesoPct: number }[];
  recomendacion: string;
}

@Component({
  selector: 'app-admin-cuellos',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="admin-layout">
      <app-sidebar activeRoute="/admin/cuellos-botella" [navItems]="navItems" />
      <div class="main-content">
        <div class="header">
          <h1>Análisis de Cuellos de Botella (IA)</h1>
          <p>Identifica demoras por funcionario y departamento utilizando el motor de IA.</p>
        </div>

        <div class="card selector-card">
          <h3>Selecciona una Política para analizar</h3>
          <div class="select-group">
            <select class="modern-select" (change)="onPoliticaSelect($event)">
              <option value="">Seleccione...</option>
              @for(p of politicas; track p.id) {
                <option [value]="p.id">{{ p.nombre }}</option>
              }
            </select>
            <button class="btn-primary" [disabled]="!selectedId || loading" (click)="analizar()">
              @if (loading) { <span class="spinner-sm"></span> }
              @else { 🔍 Analizar Rendimiento }
            </button>
          </div>
        </div>

        @if (error) {
          <div class="alert error">{{ error }}</div>
        }

        @if (aiResult) {
          <div class="results-grid">
            <div class="card stat-card">
              <div class="stat-icon purple">📊</div>
              <div class="stat-info">
                <span class="stat-label">Total Tareas Analizadas</span>
                <span class="stat-value">{{ aiResult.totalTareas }}</span>
              </div>
            </div>
            
            <div class="card stat-card">
              <div class="stat-icon blue">⏱️</div>
              <div class="stat-info">
                <span class="stat-label">Promedio de Ejecución</span>
                <span class="stat-value">{{ aiResult.promedioMinutos | number:'1.0-0' }} min</span>
              </div>
            </div>
          </div>

          <div class="card ai-card">
            <div class="ai-header">
              <span class="ai-sparkles">✨</span>
              <h3>Recomendación de la IA</h3>
            </div>
            <p class="ai-recomendacion">{{ aiResult.recomendacion }}</p>
          </div>

          <div class="card cuellos-card">
            <h3>Nodos y Funcionarios con Cuellos de Botella</h3>
            @if (aiResult.cuellos.length === 0) {
              <div class="empty-state">
                No se detectaron cuellos de botella significativos en este flujo.
              </div>
            } @else {
              <div class="cuellos-list">
                @for(c of aiResult.cuellos; track c.nodo) {
                  <div class="cuello-item">
                    <div class="cuello-info">
                      <span class="nodo-name">{{ c.nodo }}</span>
                      <span class="nodo-desc">Exceso detectado en los tiempos de respuesta.</span>
                    </div>
                    <div class="cuello-badge">
                      <span class="danger-icon">⚠️</span>
                      +{{ c.excesoPct | number:'1.0-0' }}% demora
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-layout { display: flex; min-height: 100vh; background: #f8fafc; }
    .main-content { flex: 1; padding: 40px; overflow-y: auto; }
    .header { margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; color: #0f172a; font-weight: 800; }
    .header p { margin: 8px 0 0; color: #64748b; }
    
    .card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 24px; border: 1px solid #e2e8f0; }
    .card h3 { margin: 0 0 16px 0; font-size: 16px; color: #1e293b; font-weight: 700; }
    
    .selector-card .select-group { display: flex; gap: 16px; align-items: center; }
    .modern-select { flex: 1; max-width: 400px; padding: 12px 16px; border-radius: 10px; border: 2px solid #e2e8f0; outline: none; font-size: 14px; color: #1e293b; transition: all 0.2s; }
    .modern-select:focus { border-color: #4f46e5; }
    
    .btn-primary { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
    .btn-primary:hover:not(:disabled) { background: #4338ca; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .alert.error { background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; padding: 16px; border-radius: 10px; margin-bottom: 24px; font-weight: 500; }
    
    .results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 16px; margin-bottom: 0; }
    .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .stat-icon.purple { background: #f3e8ff; color: #a855f7; }
    .stat-icon.blue { background: #dbeafe; color: #3b82f6; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-label { font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    
    .ai-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #4f46e5; }
    .ai-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .ai-header h3 { margin: 0; color: #4f46e5; }
    .ai-sparkles { font-size: 20px; }
    .ai-recomendacion { margin: 0; font-size: 15px; line-height: 1.6; color: #334155; }
    
    .cuellos-list { display: flex; flex-direction: column; gap: 16px; }
    .cuello-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; transition: all 0.2s; }
    .cuello-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .cuello-info { display: flex; flex-direction: column; gap: 4px; }
    .nodo-name { font-weight: 700; color: #1e293b; font-size: 15px; }
    .nodo-desc { font-size: 13px; color: #64748b; }
    .cuello-badge { display: flex; align-items: center; gap: 6px; background: #fef2f2; color: #ef4444; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 14px; border: 1px solid #fecaca; }
    
    .empty-state { text-align: center; padding: 32px; color: #64748b; font-weight: 500; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; }
  `]
})
export class AdminCuellosComponent implements OnInit {
  politicas: Politica[] = [];
  selectedId = '';
  loading = false;
  error = '';
  aiResult: AIResult | null = null;

  navItems = ADMIN_NAV_ITEMS;

  private politicaService = inject(PoliticaService);
  private aiService = inject(AIService);

  ngOnInit() {
    this.politicaService.getAll().subscribe(p => this.politicas = p);
  }

  onPoliticaSelect(event: any) {
    this.selectedId = event.target.value;
    this.aiResult = null;
    this.error = '';
  }

  analizar() {
    if (!this.selectedId) return;
    this.loading = true;
    this.error = '';
    this.aiResult = null;
    
    this.aiService.detectarCuellosBottella(this.selectedId).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.aiResult = this.parseAIResult(res);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Error al conectar con la IA.';
      }
    });
  }

  private parseAIResult(res: any): AIResult {
    const cuellos: { nodo: string; excesoPct: number }[] = [];
    if (Array.isArray(res.cuellosBottella)) {
      for (const c of res.cuellosBottella) {
        cuellos.push({
          nodo: c.nombreNodo || c.nodo || c.nodeId || 'Nodo desconocido',
          excesoPct: c.excesoPorcentaje ?? c.excesoPct ?? c.excess ?? 0,
        });
      }
    }
    return {
      totalTareas: res.totalTareas ?? res.totalTasks ?? 0,
      promedioMinutos: res.promedioMinutos ?? res.averageMinutes ?? 0,
      cuellos,
      recomendacion: res.recomendacion ?? res.recommendation ?? '',
    };
  }
}
