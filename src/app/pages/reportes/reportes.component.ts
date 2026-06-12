import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SidebarComponent, NavItem } from '../../components/sidebar/sidebar.component';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

interface ReporteData {
  reporteId: string;
  titulo: string;
  columnas: string[];
  filas: string[][];
  resumen: string;
  exportable: boolean;
  solicitudOriginal: string;
  // Añadimos para Chart.js simulado
  graficoConfig?: {
    tipo: ChartType;
    labels: string[];
    data: number[];
  };
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, BaseChartDirective],
  template: `
    <div class="app-layout">
      <app-sidebar activeRoute="/reportes" [navItems]="navItems" />
      <main class="main-content">
        
        <div class="page-header">
          <div>
            <h1 class="page-title">Métricas y Reportes IA</h1>
            <p class="page-sub">Consulta los datos de tu organización usando lenguaje natural</p>
          </div>
        </div>

        <div class="reportes-grid">
          
          <!-- Panel Izquierdo: Buscador IA y Ejemplos -->
          <div class="ia-panel glass-card">
            <h2 class="section-title"><span class="ia-icon">✨</span> Pregúntale a tus datos</h2>
            
            <div class="search-box">
              <textarea 
                [(ngModel)]="solicitud" 
                (keydown)="onKeydown($event)"
                class="ia-input" 
                rows="3" 
                placeholder="Ej. Muéstrame el tiempo promedio de resolución por departamento..."
              ></textarea>
              <button class="btn-generate" (click)="generarReporte()" [disabled]="!solicitud.trim() || cargando">
                @if (cargando) { <span class="spinner-sm"></span> Procesando... }
                @else { Generar Reporte }
              </button>
            </div>

            <div class="examples-section">
              <h4 class="ex-title">Ejemplos rápidos:</h4>
              <div class="tags-container">
                @for (ej of ejemplos; track ej) {
                  <span class="ex-tag" (click)="usarEjemplo(ej)">{{ ej }}</span>
                }
              </div>
            </div>

            @if (error) {
              <div class="error-box mt-4">{{ error }}</div>
            }

            @if (historial.length > 0) {
              <div class="history-section mt-6">
                <h4 class="ex-title">Consultas recientes:</h4>
                <div class="history-list">
                  @for (h of historial; track h.reporteId) {
                    <div class="history-item" (click)="cargarReporte(h)">
                      <span class="hist-icon">🕒</span>
                      <div class="hist-texts">
                        <div class="hist-title">{{ h.titulo }}</div>
                        <div class="hist-query">"{{ h.solicitudOriginal }}"</div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Panel Derecho: Resultados (KPIs, Gráficos, Tablas) -->
          <div class="results-panel">
            @if (reporte) {
              <div class="glass-card result-card">
                <div class="result-header">
                  <h2 class="res-title">{{ reporte.titulo }}</h2>
                  @if (reporte.exportable) {
                    <button class="btn-outline-sm" (click)="exportarExcel()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                      Exportar Excel
                    </button>
                  }
                </div>

                <div class="res-summary">
                  <div class="ai-badge">IA</div>
                  <p>{{ reporte.resumen }}</p>
                </div>

                @if (reporte.graficoConfig) {
                  <div class="chart-container">
                    <canvas baseChart
                      [data]="chartData"
                      [options]="chartOptions"
                      [type]="reporte.graficoConfig.tipo">
                    </canvas>
                  </div>
                }

                @if (reporte.columnas.length > 0) {
                  <div class="table-container mt-6">
                    <table class="data-table">
                      <thead>
                        <tr>
                          @for (col of reporte.columnas; track col) { <th>{{ col }}</th> }
                        </tr>
                      </thead>
                      <tbody>
                        @for (fila of reporte.filas; track $index) {
                          <tr>
                            @for (celda of fila; track $index) { <td>{{ celda }}</td> }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state glass-card">
                <div class="es-icon">📊</div>
                <h3>Sin datos para mostrar</h3>
                <p>Escribe una consulta en el panel izquierdo para generar un reporte inteligente con gráficos interactivos y tablas exportables.</p>
              </div>
            }
          </div>

        </div>
      </main>
    </div>
  `,
  styles: [`
    .reportes-grid { display: grid; grid-template-columns: 380px 1fr; gap: 24px; align-items: start; height: calc(100vh - 120px); }
    
    /* Panel Izquierdo */
    .ia-panel { display: flex; flex-direction: column; padding: 24px; max-height: 100%; overflow-y: auto; }
    .section-title { font-size: 16px; font-weight: 700; margin: 0 0 20px; display: flex; align-items: center; gap: 8px; color: var(--text); }
    .ia-icon { font-size: 18px; }
    
    .search-box { display: flex; flex-direction: column; gap: 12px; background: var(--bg-2); padding: 12px; border-radius: 12px; border: 1px solid var(--border-2); transition: all 0.2s; }
    .search-box:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px hsl(216, 85%, 57%, 0.15); background: var(--card); }
    .ia-input { background: transparent; border: none; font-family: inherit; font-size: 14px; color: var(--text); outline: none; resize: none; width: 100%; }
    .btn-generate { background: linear-gradient(135deg, var(--primary), var(--purple)); color: white; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-generate:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .examples-section { margin-top: 24px; }
    .ex-title { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
    .tags-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .ex-tag { background: transparent; border: 1px solid var(--border-2); color: var(--text-muted); border-radius: 16px; padding: 6px 12px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .ex-tag:hover { background: hsl(216, 85%, 57%, 0.08); border-color: var(--primary); color: var(--primary); }

    .history-list { display: flex; flex-direction: column; gap: 8px; }
    .history-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 10px; background: var(--bg-2); cursor: pointer; transition: all 0.2s; }
    .history-item:hover { background: var(--card); border: 1px solid var(--border); box-shadow: var(--shadow); }
    .hist-icon { font-size: 14px; margin-top: 2px; }
    .hist-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .hist-query { font-size: 11px; color: var(--text-faint); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }

    /* Panel Derecho */
    .results-panel { max-height: 100%; overflow-y: auto; padding-right: 8px; }
    .result-card { padding: 32px; display: flex; flex-direction: column; gap: 24px; }
    .result-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .res-title { font-size: 20px; font-weight: 700; margin: 0; color: var(--text); }
    .btn-outline-sm { background: transparent; border: 1px solid var(--border-2); color: var(--text); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
    .btn-outline-sm:hover { border-color: var(--primary); color: var(--primary); background: hsl(216, 85%, 57%, 0.05); }

    .res-summary { background: hsl(282, 69%, 45%, 0.05); border-left: 3px solid var(--purple); padding: 16px 20px; border-radius: 0 12px 12px 0; font-size: 14px; line-height: 1.6; color: var(--text); display: flex; gap: 16px; align-items: flex-start; }
    .ai-badge { background: linear-gradient(135deg, var(--purple), var(--primary)); color: white; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; letter-spacing: 0.05em; }

    .chart-container { background: var(--bg-2); border: 1px solid var(--border-2); border-radius: 16px; padding: 24px; height: 350px; display: flex; align-items: center; justify-content: center; }

    .table-container { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--card); }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: var(--bg-2); padding: 14px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    .data-table td { padding: 14px 16px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border-2); }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: hsl(216, 85%, 57%, 0.02); }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; min-height: 400px; padding: 40px; }
    .es-icon { font-size: 48px; margin-bottom: 20px; opacity: 0.8; }
    .empty-state h3 { font-size: 18px; font-weight: 700; margin: 0 0 10px; color: var(--text); }
    .empty-state p { font-size: 14px; color: var(--text-muted); max-width: 400px; line-height: 1.5; }

    .mt-4 { margin-top: 16px; }
    .mt-6 { margin-top: 24px; }
    .error-box { background: hsl(355, 80%, 55%, 0.1); color: var(--danger); padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid hsl(355, 80%, 55%, 0.2); }
    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
    
    @media (max-width: 1024px) {
      .reportes-grid { grid-template-columns: 1fr; height: auto; }
      .ia-panel { max-height: 400px; }
    }
  `]
})
export class ReportesComponent {

  solicitud = '';
  reporte: ReporteData | null = null;
  cargando = false;
  error = '';
  historial: ReporteData[] = [];

  navItems: NavItem[] = [
    { icon: '📊', label: 'Reportes NLP', route: '/reportes' },
    { icon: '🛠️', label: 'Panel Admin', route: '/admin' }
  ];

  readonly ejemplos = [
    'Muéstrame el total de trámites por estado',
    'Dame el tiempo promedio de resolución por departamento',
    'Cuántos trámites se completaron vs rechazaron',
    'Resumen general del rendimiento del sistema'
  ];

  // Chart configuration
  chartData: ChartData<'bar' | 'pie'> = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { family: 'Space Grotesk' }, color: '#64748b' } }
    }
  };

  constructor(private http: HttpClient) {}

  generarReporte(): void {
    if (!this.solicitud.trim() || this.cargando) return;

    this.cargando = true;
    this.error = '';
    this.reporte = null;

    this.http.post<ReporteData>(`${environment.apiUrl}/reportes/generar`, { solicitud: this.solicitud }).subscribe({
      next: (data) => {
        // MOCK para asegurar que haya gráfico visual si el backend no lo provee (ya que es IA simulada a veces)
        if (!data.graficoConfig && data.columnas.length >= 2 && data.filas.length > 0) {
          data.graficoConfig = {
            tipo: data.filas.length > 5 ? 'bar' : 'pie',
            labels: data.filas.map(f => f[0]),
            data: data.filas.map(f => parseFloat(f[1]) || 0)
          };
        }
        
        this.procesarGrafico(data);
        this.reporte = data;
        
        const existe = this.historial.find(h => h.reporteId === data.reporteId);
        if (!existe) {
          this.historial.unshift(data);
          if (this.historial.length > 10) this.historial.pop();
        }
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Error al generar el reporte. La IA podría estar no disponible.';
        this.cargando = false;
      }
    });
  }

  private procesarGrafico(data: ReporteData) {
    if (!data.graficoConfig) return;
    
    // Paleta premium
    const colors = [
      '#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6'
    ];
    
    this.chartData = {
      labels: data.graficoConfig.labels,
      datasets: [
        {
          data: data.graficoConfig.data,
          backgroundColor: data.graficoConfig.tipo === 'pie' ? colors : 'rgba(99, 102, 241, 0.7)',
          borderColor: data.graficoConfig.tipo === 'pie' ? '#fff' : 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
          borderRadius: data.graficoConfig.tipo === 'bar' ? 6 : 0
        }
      ]
    };
  }

  exportarExcel(): void {
    if (!this.reporte?.reporteId || !this.reporte.exportable) return;
    const url = `${environment.apiUrl}/reportes/${this.reporte.reporteId}/excel`;
    this.http.get(url, { responseType: 'blob' }).subscribe(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `reporte-${this.reporte!.reporteId.substring(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  usarEjemplo(ejemplo: string): void {
    this.solicitud = ejemplo;
    this.generarReporte();
  }

  cargarReporte(rep: ReporteData): void {
    this.solicitud = rep.solicitudOriginal;
    this.procesarGrafico(rep);
    this.reporte = rep;
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.generarReporte();
    }
  }
}
