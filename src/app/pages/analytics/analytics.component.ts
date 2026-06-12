import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AIService } from '../../services/ai/ai.service';
import { PoliticaService } from '../../services/politica/politica.service';
import { SidebarComponent, NavItem, ADMIN_NAV_ITEMS } from '../../components/sidebar/sidebar.component';
import { Politica } from '../../models/models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar activeRoute="/analytics" [navItems]="navItems" />
      <main class="main-content">

        <div class="page-header">
          <div>
            <h1 class="page-title">📊 Analytics & IA</h1>
            <p class="page-sub">Panel de control, métricas, cuellos de botella y rendimiento de la organización.</p>
          </div>
        </div>

        <!-- TABS NAV -->
        <div class="tabs-nav" style="margin-bottom: 20px; border-bottom: 1px solid var(--border); display: flex; gap: 20px;">
          <button class="tab-btn" [class.active]="activeTab === 'general'" (click)="activeTab = 'general'">🌐 General y Anomalías</button>
          <button class="tab-btn" [class.active]="activeTab === 'politicas'" (click)="activeTab = 'politicas'">🔀 Análisis por Política</button>
          <button class="tab-btn" [class.active]="activeTab === 'departamentos'" (click)="activeTab = 'departamentos'">🏢 Por Departamento/Funcionario</button>
        </div>

        <!-- TAB: GENERAL -->
        @if (activeTab === 'general') {
          <div class="tab-content">
            <!-- Anomalías IA (CU-29) -->
            <div class="glass-card" style="margin-bottom:20px; border-left: 4px solid var(--danger);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h3 style="font-size:16px;font-weight:600;margin:0; color: var(--danger)">🚨 Anomalías Detectadas (IA LSTM)</h3>
                <button class="btn-outline" style="font-size:12px" (click)="cargarAnomalias()">Actualizar</button>
              </div>
              
              @if (loadingAnomalias) {
                <div class="loading-state" style="padding:20px"><div class="spinner"></div></div>
              } @else if (anomalias.length > 0) {
                <div class="anomalias-list">
                  @for (a of anomalias; track a.id) {
                    <div class="alerta-cuello" style="display:flex;justify-content:space-between;align-items:center;">
                      <div>
                        <span class="badge" [class.badge-critico]="a.nivelGravedad === 'CRITICO'" [class.badge-alto]="a.nivelGravedad === 'ALTO'">{{ a.nivelGravedad }}</span>
                        <strong style="margin-left: 8px;">Trámite: {{ a.tramiteId.substring(0,8) }}... (Nodo: {{ a.nodoId }})</strong>
                        <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted)">{{ a.descripcion }}</p>
                      </div>
                      <div>
                        <button class="btn-primary" style="font-size: 11px; padding: 6px 12px;" (click)="resolverAnomalia(a.id)">Marcar Resuelta</button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                 <div class="empty-state">No se han detectado anomalías graves recientes. ¡Todo marcha bien!</div>
              }
            </div>

            <!-- KPIs Globales -->
            @if (kpis) {
              <div class="glass-card" style="margin-bottom:20px;">
                <h3 style="font-size:16px;font-weight:600;margin:0 0 16px;">📈 KPIs Globales de la Empresa</h3>
                <div class="kpis-grid">
                  <div class="kpi-card">
                    <p class="kpi-label">TOTAL TRÁMITES</p>
                    <p class="kpi-value" style="color:var(--primary)">{{ kpis.totalTramites }}</p>
                  </div>
                  <div class="kpi-card">
                    <p class="kpi-label">TASA COMPLETADO</p>
                    <p class="kpi-value" style="color:var(--success)">{{ kpis.tasaCompletadoPct }}%</p>
                  </div>
                  <div class="kpi-card">
                    <p class="kpi-label">ACTIVOS AHORA</p>
                    <p class="kpi-value" style="color:var(--warning)">{{ kpis.tramitesActivos }}</p>
                  </div>
                  <div class="kpi-card">
                    <p class="kpi-label">DURACIÓN PROM.</p>
                    <p class="kpi-value">{{ kpis.duracionPromedioMinutos }} min</p>
                  </div>
                  <div class="kpi-card">
                    <p class="kpi-label">TAREAS PENDIENTES</p>
                    <p class="kpi-value" style="color:var(--danger)">{{ kpis.tareasPendientes }}</p>
                  </div>
                  <div class="kpi-card">
                    <p class="kpi-label">RECHAZADOS</p>
                    <p class="kpi-value" style="color:var(--danger)">{{ kpis.tramitesRechazados }}</p>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- TAB: POR POLÍTICA (CUELLOS) -->
        @if (activeTab === 'politicas') {
          <div class="tab-content">
            <div class="glass-card" style="margin-bottom:20px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px; flex-wrap:wrap; gap: 10px;">
                <h3 style="font-size:16px;font-weight:600;margin:0">🤖 Análisis de Cuellos de Botella en Políticas</h3>
                <div style="display:flex;gap:10px;">
                  <select class="form-input" style="width:250px" [(ngModel)]="politicaSeleccionada" (change)="analizarPolitica()">
                    <option value="">Seleccionar política a analizar...</option>
                    @for (p of politicas; track p.id) {
                      <option [value]="p.id">{{ p.nombre }}</option>
                    }
                  </select>
                  <button class="btn-primary" (click)="analizarPolitica()" [disabled]="!politicaSeleccionada || loadingAnalisis">
                    {{ loadingAnalisis ? '⏳ Analizando...' : 'Analizar' }}
                  </button>
                </div>
              </div>

              @if (loadingAnalisis) {
                <div class="loading-state" style="padding:40px"><div class="spinner"></div><p style="margin-top:10px;color:var(--text-muted)">La IA está analizando los datos históricos de la política seleccionada...</p></div>
              } @else if (analisisIA) {
                <div class="analisis-stats">
                  <div class="analisis-stat">
                    <p class="stat-label">TAREAS ANALIZADAS</p>
                    <p class="stat-value" style="color:var(--primary)">{{ analisisIA.totalTareasAnalizadas || 0 }}</p>
                  </div>
                  <div class="analisis-stat">
                    <p class="stat-label">PROMEDIO GENERAL</p>
                    <p class="stat-value">{{ analisisIA.promedioGeneralMinutos || 0 }} min</p>
                  </div>
                  <div class="analisis-stat">
                    <p class="stat-label">CUELLOS DETECTADOS</p>
                    <p class="stat-value" [style.color]="(analisisIA.cuellosDetectados?.length || 0) > 0 ? 'var(--danger)' : 'var(--success)'">
                      {{ analisisIA.cuellosDetectados?.length || 0 }}
                    </p>
                  </div>
                </div>

                @for (c of analisisIA.cuellosDetectados || []; track c.nodoId) {
                  <div class="alerta-cuello">
                    ⚠️ El paso <strong>{{ c.nodoId }}</strong> está
                    <strong style="color:var(--danger)">{{ c.excesoPorcentaje }}% por encima</strong>
                    del promedio de tiempo de todo el trámite (Toma {{ c.promedioMinutos | number:'1.0-0' }} min vs el promedio general de {{ c.promedioGeneral | number:'1.0-0' }} min)
                  </div>
                }

                @if (analisisIA.analisisIA) {
                  <div class="ia-insight">
                    <p class="insight-label">💡 Recomendaciones Estratégicas de la IA</p>
                    <p class="insight-texto">{{ analisisIA.analisisIA }}</p>
                  </div>
                }
              } @else {
                <div class="empty-state" style="margin-top: 30px;">Selecciona una política en el menú superior para identificar cuellos de botella.</div>
              }
            </div>
          </div>
        }

        <!-- TAB: DEPARTAMENTOS -->
        @if (activeTab === 'departamentos') {
          <div class="tab-content">
            <!-- Promedios por departamento -->
            <div class="glass-card" style="margin-bottom:20px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h3 style="font-size:16px;font-weight:600;margin:0">⏱️ Tiempo Promedio por Departamento</h3>
                <button class="btn-outline" style="font-size:12px" (click)="cargarPromediosDept()">Actualizar</button>
              </div>
              @if (loadingDept) {
                <div class="loading-state" style="padding:30px"><div class="spinner"></div></div>
              } @else if (promediosDept && objectKeys(promediosDept).length > 0) {
                <div class="dept-grid">
                  @for (key of objectKeys(promediosDept); track key) {
                    <div class="dept-card">
                      <div class="dept-name">{{ key }}</div>
                      <div class="dept-value">{{ promediosDept[key] | number:'1.0-0' }} min</div>
                      <div class="dept-bar">
                        <div class="dept-bar-fill" [style.width]="getBarWidth(promediosDept[key]) + '%'"
                          [style.background]="getBarColor(promediosDept[key])"></div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">No hay datos suficientes de tareas para calcular el promedio por departamento.</div>
              }
            </div>

            <!-- Eficiencia de funcionarios -->
            <div class="glass-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                <h3 style="font-size:16px;font-weight:600;margin:0">👥 Eficiencia y Rendimiento por Funcionario</h3>
                <select class="form-input" style="width:250px" [(ngModel)]="deptSeleccionado" (change)="cargarEficiencia()">
                  <option value="">Seleccionar departamento a analizar...</option>
                  @for (key of objectKeys(promediosDept); track key) {
                    <option [value]="key">{{ key }}</option>
                  }
                </select>
              </div>
              @if (deptSeleccionado) {
                @if (eficiencia.length > 0) {
                  <div class="table-wrap" style="margin-top: 10px;">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th># RKG</th>
                          <th>FUNCIONARIO</th>
                          <th>PROMEDIO TAREA (min)</th>
                          <th>ESTADO DE EFICIENCIA</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (f of eficiencia; track f.funcionarioId; let i = $index) {
                          <tr>
                            <td class="mono" style="font-weight:bold; color:var(--text-muted)">{{ i + 1 }}</td>
                            <td style="font-weight:500;">{{ f.nombreFuncionario || f.funcionarioId }}</td>
                            <td class="mono">{{ f.promedioDuracion | number:'1.0-0' }}</td>
                            <td>
                              <span class="badge" [class.badge-completado]="i === 0"
                                [class.badge-proceso]="i > 0 && i < eficiencia.length - 1"
                                [class.badge-nuevo]="i === eficiencia.length - 1 && eficiencia.length > 1">
                                {{ i === 0 ? '🏆 Sobresaliente' : (i === eficiencia.length - 1 && eficiencia.length > 1) ? '🐢 Requiere Mejora' : '⚡ Estable' }}
                              </span>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="empty-state">No hay datos de funcionarios para el departamento seleccionado.</div>
                }
              } @else {
                <div class="empty-state">Selecciona un departamento en el menú de la derecha para ver la eficiencia de sus funcionarios.</div>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .tabs-nav { margin-top: 10px; }
    .tab-btn {
      background: none; border: none; padding: 10px 16px; color: var(--text-muted);
      font-size: 14px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-content { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

    .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .kpis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .kpi-card {
      background: var(--bg-2); border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.02);
      border-radius: 12px; padding: 20px; text-align: center;
    }
    .kpi-label { font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; margin: 0 0 8px; font-weight: 600; }
    .kpi-value { font-size: 32px; font-weight: 700; margin: 0; color: var(--text); }
    .dept-card {
      background: var(--bg-2); border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.02);
      border-radius: 12px; padding: 18px;
    }
    .dept-name { font-size: 14px; color: var(--text-muted); margin-bottom: 8px; font-weight: 500; }
    .dept-value { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
    .dept-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .dept-bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
    .analisis-stats { display: flex; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; background: var(--bg-2); padding: 16px; border-radius: 10px; }
    .analisis-stat { flex: 1; min-width: 120px; text-align: center; border-right: 1px solid var(--border); }
    .analisis-stat:last-child { border-right: none; }
    .stat-label { font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; margin: 0 0 6px; font-weight:600; }
    .stat-value { font-size: 30px; font-weight: 700; margin: 0; color: var(--text); }
    .alerta-cuello {
      padding: 14px 18px; margin-bottom: 12px;
      background: hsl(355,80%,55%,0.08); border: 1px solid hsl(355,80%,55%,0.25);
      border-radius: 10px; font-size: 14px; line-height: 1.5;
    }
    .ia-insight {
      background: hsl(282,69%,45%,0.08); border: 1px solid hsl(282,69%,45%,0.25);
      border-radius: 10px; padding: 20px; margin-top: 16px;
    }
    .insight-label { font-size: 13px; font-weight: 700; color: var(--purple); margin: 0 0 8px; display:flex; align-items:center; gap:6px; }
    .insight-texto { font-size: 14px; color: var(--text); margin: 0; line-height: 1.6; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
    .anomalias-list { display: flex; flex-direction: column; gap: 10px; }
    .badge-critico { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-alto { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
  `]
})
export class AnalyticsComponent implements OnInit {
  navItems = ADMIN_NAV_ITEMS;

  politicas: Politica[] = [];
  politicaSeleccionada = '';
  deptSeleccionado = '';
  activeTab = 'general';
  analisisIA: any = null;
  promediosDept: any = {};
  eficiencia: any[] = [];
  kpis: any = null;
  anomalias: any[] = [];
  loadingAnalisis = false;
  loadingDept = false;
  loadingAnomalias = false;

  objectKeys = Object.keys;

  constructor(
    private aiService: AIService,
    private politicaService: PoliticaService,
    private http: HttpClient,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.politicaService.getAll().pipe(catchError(() => of([]))).subscribe(p => {
      this.politicas = p;
    });
    this.cargarPromediosDept();
    this.cargarKpis();
    this.cargarAnomalias();
  }

  cargarAnomalias(): void {
    this.loadingAnomalias = true;
    this.http.get<any[]>(`${environment.apiUrl}/predictor/anomalias`)
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.anomalias = data;
        this.loadingAnomalias = false;
      });
  }

  resolverAnomalia(id: string): void {
    this.http.post(`${environment.apiUrl}/predictor/anomalias/${id}/resolver`, {})
      .subscribe(() => {
        this.anomalias = this.anomalias.filter(a => a.id !== id);
      });
  }

  cargarKpis(): void {
    this.http.get<any>(`${environment.apiUrl}/analytics/kpis`)
      .pipe(catchError(() => of(null)))
      .subscribe(data => { this.kpis = data; });
  }

  analizarPolitica(): void {
    if (!this.politicaSeleccionada) return;
    this.loadingAnalisis = true;
    this.aiService.detectarCuellosBottella(this.politicaSeleccionada)
      .pipe(catchError(() => of(null)))
      .subscribe(data => {
        this.analisisIA = data;
        this.loadingAnalisis = false;
      });
  }

  cargarPromediosDept(): void {
    this.loadingDept = true;
    this.http.get<any>(`${environment.apiUrl}/analytics/departamentos`)
      .pipe(catchError(() => of({})))
      .subscribe(data => {
        this.promediosDept = data;
        this.loadingDept = false;
      });
  }

  cargarEficiencia(): void {
    if (!this.deptSeleccionado) return;
    this.http.get<any[]>(`${environment.apiUrl}/analytics/funcionarios/${encodeURIComponent(this.deptSeleccionado)}`)
      .pipe(catchError(() => of([])))
      .subscribe(data => { this.eficiencia = data; });
  }

  getBarWidth(val: number): number {
    const max = Math.max(...Object.values(this.promediosDept) as number[]);
    return max > 0 ? (val / max) * 100 : 0;
  }

  getBarColor(val: number): string {
    const max = Math.max(...Object.values(this.promediosDept) as number[]);
    const pct = max > 0 ? val / max : 0;
    if (pct > 0.7) return 'var(--danger)';
    if (pct > 0.4) return 'var(--warning)';
    return 'var(--success)';
  }
}
