import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tramite } from '../../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TramiteService {

  private apiUrl = `${environment.apiUrl}/tramites`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Tramite[]> {
    return this.http.get<Tramite[]>(this.apiUrl);
  }

  getById(id: string): Observable<Tramite> {
    return this.http.get<Tramite>(`${this.apiUrl}/${id}`);
  }

  getByCliente(clienteId: string): Observable<Tramite[]> {
    return this.http.get<Tramite[]>(`${this.apiUrl}/cliente/${clienteId}`);
  }

  getProgreso(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/progreso`);
  }

  getByReferencia(ref: string): Observable<Tramite> {
    return this.http.get<Tramite>(`${this.apiUrl}/referencia/${ref}`);
  }

  iniciar(politicaId: string, clienteId: string, descripcion = ''): Observable<Tramite> {
    return this.http.post<Tramite>(
      `${this.apiUrl}/iniciar?politicaId=${politicaId}&clienteId=${clienteId}&descripcion=${encodeURIComponent(descripcion)}`, {}
    );
  }

  iniciarPorEmail(politicaId: string, clienteEmail: string, descripcion = ''): Observable<Tramite> {
    return this.http.post<Tramite>(
      `${this.apiUrl}/iniciar-por-email?politicaId=${politicaId}&clienteEmail=${encodeURIComponent(clienteEmail)}&descripcion=${encodeURIComponent(descripcion)}`, {}
    );
  }

  iniciarPorAdmin(tramiteId: string): Observable<Tramite> {
    return this.http.put<Tramite>(`${this.apiUrl}/${tramiteId}/iniciar`, {});
  }

  descargarPdf(tramiteId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/pdf/tramite/${tramiteId}`, {
      responseType: 'blob'
    });
  }

  subirArchivo(tramiteId: string, archivo: File, nombreRequisito: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('nombreRequisito', nombreRequisito);
    return this.http.post(`${this.apiUrl}/${tramiteId}/archivos`, formData);
  }
}

