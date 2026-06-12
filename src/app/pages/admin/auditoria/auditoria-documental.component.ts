import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DocumentoService } from '../../../services/documento/documento.service';

@Component({
  selector: 'app-auditoria-documental',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="audit-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Auditoría Documental</h1>
          <p class="page-sub">Trámite ID: {{ tramiteId }}</p>
        </div>
        <div class="actions">
          <button class="btn btn-outline" routerLink="../">Volver al Repositorio</button>
        </div>
      </div>

      <div class="audit-content">
        @if (cargando) {
          <div class="loading">Cargando historial de auditoría...</div>
        } @else if (error) {
          <div class="alert error">❌ {{ error }}</div>
        } @else {
          <div class="table-container">
            <table class="audit-table">
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Acción</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Resultado</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                @for (log of auditoria; track log.id) {
                  <tr>
                    <td class="date-cell">{{ log.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td>
                      <span class="badge" [class]="getBadgeClass(log.accion)">
                        {{ log.accion }}
                      </span>
                    </td>
                    <td class="user-cell">
                      <span class="user-name">{{ log.nombreUsuario }}</span>
                      <span class="user-id">ID: {{ log.usuarioId.substring(0,8) }}...</span>
                    </td>
                    <td><span class="role-badge">{{ log.rolUsuario }}</span></td>
                    <td>
                      <span class="result" [class.denegado]="log.resultado === 'DENEGADO'">
                        {{ log.resultado }}
                      </span>
                    </td>
                    <td class="detail-cell">{{ log.detalle }}</td>
                  </tr>
                }
                @if (auditoria.length === 0) {
                  <tr>
                    <td colspan="6" class="empty-state">No hay registros de auditoría para este trámite.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .audit-page { padding: 30px; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
    .page-sub { color: #64748b; font-size: 14px; margin: 0; }
    .btn { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-outline { background: white; border: 1px solid #e2e8f0; color: #475569; }
    .btn-outline:hover { background: #f8fafc; }

    .loading { text-align: center; padding: 40px; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; font-weight: 500; }
    .error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

    .table-container { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .audit-table { width: 100%; border-collapse: collapse; text-align: left; }
    .audit-table th { background: #f8fafc; padding: 14px 20px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
    .audit-table td { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b; vertical-align: middle; }
    .audit-table tbody tr:last-child td { border-bottom: none; }
    .audit-table tbody tr:hover { background: #f8fafc; }

    .date-cell { font-family: monospace; color: #64748b !important; }
    .user-cell { display: flex; flex-direction: column; gap: 2px; }
    .user-name { font-weight: 500; }
    .user-id { font-size: 11px; color: #94a3b8; font-family: monospace; }
    
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; }
    .badge-subir { background: #dcfce7; color: #166534; }
    .badge-ver { background: #dbeafe; color: #1e40af; }
    .badge-eliminar { background: #fee2e2; color: #991b1b; }
    .badge-permisos { background: #fef3c7; color: #92400e; }
    
    .role-badge { background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    
    .result { font-weight: 700; color: #16a34a; }
    .result.denegado { color: #dc2626; }
    
    .detail-cell { color: #64748b; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .empty-state { text-align: center; color: #64748b; padding: 40px !important; }
  `]
})
export class AuditoriaDocumentalComponent implements OnInit {
  tramiteId = '';
  auditoria: any[] = [];
  cargando = false;
  error = '';

  private route = inject(ActivatedRoute);
  private documentoService = inject(DocumentoService);

  ngOnInit() {
    this.tramiteId = this.route.snapshot.paramMap.get('id') || '';
    if (this.tramiteId) {
      this.cargarAuditoria();
    }
  }

  cargarAuditoria() {
    this.cargando = true;
    this.documentoService.obtenerAuditoriaTramite(this.tramiteId).subscribe({
      next: (logs: any[]) => {
        this.auditoria = logs;
        this.cargando = false;
      },
      error: (err: any) => {
        this.error = 'Error al cargar el historial de auditoría';
        this.cargando = false;
      }
    });
  }

  getBadgeClass(accion: string): string {
    switch(accion) {
      case 'SUBIR': return 'badge-subir';
      case 'VER_URL': return 'badge-ver';
      case 'ELIMINAR': return 'badge-eliminar';
      case 'CAMBIAR_PERMISOS': return 'badge-permisos';
      default: return 'badge-ver';
    }
  }
}
