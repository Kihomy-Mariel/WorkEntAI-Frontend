import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentoService, DocumentoTramite } from '../../services/documento/documento.service';

/**
 * Panel de Gestión Documental para el detalle de un trámite (CU-24 al CU-27).
 * Se integra como componente hijo dentro de tramite-detalle.
 */
@Component({
  selector: 'app-documentos-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documentos-panel.component.html',
  styleUrls: ['./documentos-panel.component.css']
})
export class DocumentosPanelComponent implements OnInit {

  @Input() tramiteId!: string;
  @Input() esAdmin = false;

  documentos: DocumentoTramite[] = [];
  cargando = false;
  subiendo = false;
  error = '';
  mensajeExito = '';

  constructor(private documentoService: DocumentoService) { }

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    this.cargando = true;
    this.documentoService.listarDocumentos(this.tramiteId).subscribe({
      next: (docs) => { this.documentos = docs; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const archivo = input.files[0];
    this.subirArchivo(archivo);
    input.value = ''; // reset input
  }

  subirArchivo(archivo: File): void {
    this.subiendo = true;
    this.error = '';
    this.documentoService.subirDocumento(this.tramiteId, archivo).subscribe({
      next: (doc) => {
        this.documentos.unshift(doc);
        this.subiendo = false;
        this.mostrarExito('Documento subido correctamente a S3 ✅');
      },
      error: (err) => {
        this.subiendo = false;
        this.error = err.error?.message || 'Error al subir el archivo. Verifica el tipo y tamaño (máx 50 MB).';
        setTimeout(() => this.error = '', 5000);
      }
    });
  }

  descargar(doc: DocumentoTramite): void {
    this.documentoService.obtenerUrlDescarga(doc.id).subscribe({
      next: ({ url }) => {
        window.open(url, '_blank');
      },
      error: () => {
        this.error = 'No tienes permiso para descargar este documento.';
        setTimeout(() => this.error = '', 4000);
      }
    });
  }

  eliminar(doc: DocumentoTramite): void {
    if (!confirm(`¿Eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.documentoService.eliminarDocumento(doc.id).subscribe({
      next: () => {
        this.documentos = this.documentos.filter(d => d.id !== doc.id);
        this.mostrarExito('Documento eliminado.');
      },
      error: () => { this.error = 'Error al eliminar el documento.'; }
    });
  }

  private mostrarExito(msg: string): void {
    this.mensajeExito = msg;
    setTimeout(() => this.mensajeExito = '', 3000);
  }

  formatearTamano(bytes: number): string {
    return this.documentoService.formatearTamano(bytes);
  }

  iconoPorTipo(tipoMime: string): string {
    return this.documentoService.iconoPorTipo(tipoMime);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
