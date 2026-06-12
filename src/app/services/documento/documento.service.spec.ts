import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DocumentoService, DocumentoTramite } from './documento.service';
import { environment } from '../../../environments/environment';

describe('DocumentoService', () => {
  let service: DocumentoService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/documentos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DocumentoService]
    });
    service = TestBed.inject(DocumentoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe obtener la URL pre-firmada', () => {
    const mockResponse = { url: 'https://s3.amazonaws.com/test-bucket/test.pdf' };
    
    service.obtenerUrlDescarga('doc-123').subscribe(res => {
      expect(res.url).toBe(mockResponse.url);
    });

    const req = httpMock.expectOne(`${baseUrl}/doc-123/url`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('debe listar documentos de un trámite', () => {
    const mockDocs: DocumentoTramite[] = [
      { id: '1', nombre: 'doc1.pdf', tamanoBytes: 1024 } as DocumentoTramite,
      { id: '2', nombre: 'doc2.jpg', tamanoBytes: 2048 } as DocumentoTramite
    ];

    service.listarDocumentos('tramite-1').subscribe(docs => {
      expect(docs.length).toBe(2);
      expect(docs[0].nombre).toBe('doc1.pdf');
    });

    const req = httpMock.expectOne(`${baseUrl}/tramite/tramite-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDocs);
  });

  describe('Utilidades', () => {
    it('debe formatear tamaño de bytes correctamente', () => {
      expect(service.formatearTamano(500)).toBe('500 B');
      expect(service.formatearTamano(1536)).toBe('1.5 KB'); // 1536 / 1024 = 1.5
      expect(service.formatearTamano(2097152)).toBe('2.0 MB'); // 2 * 1024 * 1024
    });

    it('debe devolver icono correcto por tipo mime', () => {
      expect(service.iconoPorTipo('application/pdf')).toBe('fa-file-pdf');
      expect(service.iconoPorTipo('image/jpeg')).toBe('fa-file-image');
      expect(service.iconoPorTipo('application/vnd.ms-excel')).toBe('fa-file-excel');
      expect(service.iconoPorTipo('application/unknown')).toBe('fa-file');
    });
  });
});
