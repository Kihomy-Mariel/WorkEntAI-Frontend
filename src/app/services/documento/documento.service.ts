import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentoTramite {
  id: string;
  tramiteId: string;
  nodoId?: string;
  nombre: string;
  descripcion?: string;
  tipoMime: string;
  tamanoBytes: number;
  version: number;
  s3Key: string;
  subidoPorId: string;
  subidoPorNombre: string;
  activo: boolean;
  permisos: PermisoDocumento[];
  fechaSubida: string;
  fechaActualizacion: string;
}

export interface PermisoDocumento {
  rol: string;
  acciones: string[];
}

export interface AuditoriaDocumento {
  id: string;
  documentoId: string;
  tramiteId: string;
  accion: string;
  usuarioId: string;
  nombreUsuario: string;
  rolUsuario: string;
  resultado: string;
  detalle: string;
  timestamp: string;
}

/**
 * Servicio Angular de Gestión Documental (Ciclo 2 — CU-24 al CU-27).
 * Consume los endpoints de DocumentoController del backend.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoService {

  private readonly base = `${environment.apiUrl}/documentos`;

  constructor(private http: HttpClient) {}

  /** Subir un archivo asociado a un trámite (CU-24) */
  subirDocumento(tramiteId: string, archivo: File,
                  nodoId?: string, descripcion?: string): Observable<DocumentoTramite> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (nodoId)      formData.append('nodoId', nodoId);
    if (descripcion) formData.append('descripcion', descripcion);
    return this.http.post<DocumentoTramite>(`${this.base}/tramite/${tramiteId}`, formData);
  }

  /** Listar documentos de un trámite */
  listarDocumentos(tramiteId: string): Observable<DocumentoTramite[]> {
    return this.http.get<DocumentoTramite[]>(`${this.base}/tramite/${tramiteId}`);
  }

  /** Obtener URL pre-firmada para descarga directa desde S3 (CU-25) */
  obtenerUrlDescarga(documentoId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/${documentoId}/url`);
  }

  /** Actualizar permisos RBAC de un documento (CU-26, solo ADMIN) */
  actualizarPermisos(documentoId: string, permisos: PermisoDocumento[]): Observable<DocumentoTramite> {
    return this.http.put<DocumentoTramite>(`${this.base}/${documentoId}/permisos`, permisos);
  }

  /** Eliminar lógicamente un documento */
  eliminarDocumento(documentoId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${documentoId}`);
  }

  /** Historial de auditoría de un documento (CU-27, solo ADMIN) */
  obtenerAuditoria(documentoId: string): Observable<AuditoriaDocumento[]> {
    return this.http.get<AuditoriaDocumento[]>(`${this.base}/${documentoId}/auditoria`);
  }

  /** Toda la auditoría documental de un trámite */
  obtenerAuditoriaTramite(tramiteId: string): Observable<AuditoriaDocumento[]> {
    return this.http.get<AuditoriaDocumento[]>(`${this.base}/tramite/${tramiteId}/auditoria`);
  }

  /** Formatea bytes a unidad legible */
  formatearTamano(bytes: number): string {
    if (bytes < 1024)       return `${bytes} B`;
    if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  /** Devuelve el ícono de Font Awesome según el tipo MIME */
  iconoPorTipo(tipoMime: string): string {
    if (tipoMime.includes('pdf'))   return 'fa-file-pdf';
    if (tipoMime.includes('image')) return 'fa-file-image';
    if (tipoMime.includes('word') || tipoMime.includes('document')) return 'fa-file-word';
    if (tipoMime.includes('excel') || tipoMime.includes('sheet'))   return 'fa-file-excel';
    return 'fa-file';
  }
}
