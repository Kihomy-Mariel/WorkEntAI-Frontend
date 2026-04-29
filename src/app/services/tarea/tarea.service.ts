import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tarea } from '../../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TareaService {
  private apiUrl = `${environment.apiUrl}/tareas`;

  constructor(private http: HttpClient) {}

  getByFuncionario(funcionarioId: string): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.apiUrl}/funcionario/${funcionarioId}`);
  }

  getByDepartamento(departamento: string): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.apiUrl}/departamento/${encodeURIComponent(departamento)}`);
  }

  getById(id: string): Observable<Tarea> {
    return this.http.get<Tarea>(`${this.apiUrl}/${id}`);
  }

  actualizarEstado(id: string, estado: string): Observable<Tarea> {
    return this.http.put<Tarea>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  completar(id: string, formularioDatos: any): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/completar`, formularioDatos);
  }
}

