import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgenteSession {
  id: string;
  clienteId: string;
  politicaId?: string;
  nombrePolitica?: string;
  fase: 'IDENTIFICACION' | 'REQUISITOS' | 'CONFIRMACION' | 'COMPLETADA' | 'ABANDONADA';
  mensajes: MensajeDialogo[];
  datosRecopilados: Record<string, string>;
  requisitoActualIndex: number;
  tramiteId?: string;
  activa: boolean;
  fechaCreacion: string;
  requisitosFaltantes?: string[];
  requisitosExtraidos?: Record<string, string>;
}

export interface MensajeDialogo {
  rol: 'USUARIO' | 'AGENTE';
  contenido: string;
  timestamp: string;
}

/**
 * Servicio Angular del Agente Inteligente (Ciclo 2 — CU-22/23).
 */
@Injectable({ providedIn: 'root' })
export class AgenteService {

  private readonly base = `${environment.apiUrl}/agente`;

  constructor(private http: HttpClient) {}

  iniciarSesion(): Observable<AgenteSession> {
    return this.http.post<AgenteSession>(`${this.base}/sesion`, {});
  }

  enviarMensaje(sessionId: string, mensaje: string): Observable<AgenteSession> {
    return this.http.post<AgenteSession>(
      `${this.base}/sesion/${sessionId}/mensaje`, { mensaje });
  }

  obtenerSesion(sessionId: string): Observable<AgenteSession> {
    return this.http.get<AgenteSession>(`${this.base}/sesion/${sessionId}`);
  }

  cerrarSesion(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sesion/${sessionId}`);
  }
}
