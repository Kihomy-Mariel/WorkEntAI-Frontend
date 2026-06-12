export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  departamento: string;
  /** Multi-departamento (CU-03) */
  departamentos: string[];
  activo: boolean;
  fechaCreacion?: string;
}

export interface CampoFormulario {
  nombre: string;
  tipo: 'text' | 'textarea' | 'boolean' | 'select' | 'file' | 'number'
      | 'grid' | 'fecha' | 'hora' | 'checkbox' | 'radio';
  etiqueta: string;
  requerido: boolean;
  opciones?: string[];
}


export interface CondicionNodo {

  campo: string;
  operador: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
  valor: string;
  nodoSiId: string;
  nodoNoId: string;
}

export interface Nodo {
  id: string;
  nombre: string;
  descripcion?: string;
  /** JOIN es el tipo para sincronización de ramas paralelas (CU-13) */
  tipo: 'START' | 'END' | 'TASK' | 'DECISION' | 'PARALLEL' | 'JOIN';
  departamento: string;
  responsableId: string;
  nombreResponsable?: string;
  tiempoLimiteHoras?: number;
  posX: number;
  posY: number;
  conexiones: string[];
  /** Condición evaluable para nodos DECISION (CU-05 Opción B) */
  condicion?: CondicionNodo;
  /** ID del nodo JOIN destino para nodos PARALLEL (CU-13) */
  joinNodoId?: string;
  condiciones?: Record<string, string>;
  camposFormulario?: CampoFormulario[];
  documentosRequeridos?: string[];
  permisosDocumentales?: Record<string, PermisoDocumental>;
  color?: string;
}

export interface PermisoDocumental {
  lectura: boolean;
  escritura: boolean;
  subida: boolean;
}

export interface RequisitoTramite {
  nombre: string;
  descripcion?: string;
  obligatorio: boolean;
}

export interface Politica {
  id: string;
  nombre: string;
  descripcion: string;
  categoria?: string;
  organizacion?: string;
  tiempoEstimadoDias?: number;
  /** Palabras clave para el agente IA (CU-22) */
  etiquetas?: string[];
  /** Documentos iniciales requeridos al cliente (CU-04) */
  requisitosIniciales?: RequisitoTramite[];
  nodos: Nodo[];
  estado: 'BORRADOR' | 'ACTIVA' | 'INACTIVA';
  creadoPorId: string;
  nombreCreadoPor?: string;
  version?: number;
  tramitesActivos?: number;
  tramitesCompletados?: number;
  fechaCreacion: string;
  fechaActualizacion?: string;
  fechaActivacion?: string;
}

export interface HistorialTramite {
  nodoId: string;
  nombreNodo: string;
  departamento?: string;
  funcionarioId: string;
  nombreFuncionario?: string;
  accion: string;
  observacion: string;
  resultadoDecision?: string;
  duracionMinutos?: number;
  fecha: string;
}

export interface Tramite {
  id: string;
  politicaId: string;
  nombrePolitica?: string;
  clienteId: string;
  nombreCliente?: string;
  nodoActualId: string;
  nombreNodoActual?: string;
  departamentoActual?: string;
  estado: 'NUEVO' | 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO';
  descripcion?: string;
  numeroReferencia?: string;
  prioridad?: 'BAJA' | 'MEDIA' | 'ALTA';
  historial: HistorialTramite[];
  datosFormulario?: { [key: string]: any };
  observacionFinal?: string;
  fechaInicio: string;
  fechaFin?: string;
  fechaUltimaActualizacion?: string;
  duracionMinutos?: number;
}

export interface Tarea {
  id: string;
  tramiteId: string;
  politicaId: string;
  nodoId: string;
  nombreNodo?: string;
  departamento?: string;
  funcionarioId: string;
  nombreFuncionario?: string;
  numeroReferenciaTramite?: string;
  nombrePolitica?: string;
  instrucciones?: string;
  camposFormulario?: CampoFormulario[];
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO';
  formularioDatos: { [key: string]: any };
  observacion?: string;
  prioridad?: 'BAJA' | 'MEDIA' | 'ALTA';
  fechaAsignacion: string;
  fechaCompletado?: string;
  duracionMinutos?: number;
}

export interface Notificacion {
  id: string;
  usuarioId: string;
  mensaje: string;
  tipo: string;
  referenciaId?: string;
  tipoReferencia?: string;
  leida: boolean;
  fechaCreacion: string;
  fechaLeida?: string;
}

export interface AuthResponse {
  token: string;
  id: string;
  email: string;
  nombre: string;
  rol: string;
  departamento: string;
  /** Multi-departamento (CU-03) */
  departamentos?: string[];
}

export {}
