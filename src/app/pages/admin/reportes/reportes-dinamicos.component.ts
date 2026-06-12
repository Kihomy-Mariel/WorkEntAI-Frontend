import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent, NavItem, ADMIN_NAV_ITEMS } from '../../../components/sidebar/sidebar.component';
import { environment } from '../../../../environments/environment';

// Declaración global para la API de reconocimiento de voz
declare var webkitSpeechRecognition: any;

@Component({
  selector: 'app-reportes-dinamicos',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="admin-layout">
      <app-sidebar activeRoute="/admin/reportes" [navItems]="navItems" />
      
      <div class="main-content">
        <div class="chat-wrapper">
          <!-- Chat History -->
          <div class="chat-history" #chatHistory>
            @for (msg of mensajes; track $index) {
              <div class="msg-row" [class.user]="msg.isUser" [class.ai]="!msg.isUser">
                <div class="msg-avatar">
                  @if (msg.isUser) {
                    <!-- User Icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  } @else {
                    <!-- AI Icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                  }
                </div>
                <div class="msg-content">
                  <p class="msg-text">{{ msg.text }}</p>
                  
                  <!-- Tabla de Resultados (Solo AI) -->
                  @if (!msg.isUser && msg.reporte) {
                    <div class="report-card">
                      <div class="report-header">
                        <h4>{{ msg.reporte.titulo }}</h4>
                        <div class="report-actions">
                          <button class="action-btn excel-btn" (click)="descargarArchivo(msg.reporte.reporteId, 'excel')" title="Exportar a Excel">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg> Excel
                          </button>
                          <button class="action-btn word-btn" (click)="descargarArchivo(msg.reporte.reporteId, 'word')" title="Exportar a Word">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> Word
                          </button>
                          <button class="action-btn pdf-btn" (click)="descargarArchivo(msg.reporte.reporteId, 'pdf')" title="Exportar a PDF">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15v-4"/><path d="M12 15v-4"/><path d="M15 15v-4"/></svg> PDF
                          </button>
                        </div>
                      </div>
                      
                      <div class="table-container">
                        <table class="report-table">
                          <thead>
                            <tr>
                              @for (col of msg.reporte.columnas; track col) {
                                <th>{{ col }}</th>
                              }
                            </tr>
                          </thead>
                          <tbody>
                            @for (fila of msg.reporte.filas; track $index) {
                              <tr>
                                @for (celda of fila; track $index) {
                                  <td>{{ celda }}</td>
                                }
                              </tr>
                            }
                          </tbody>
                        </table>
                        @if (msg.reporte.filas?.length === 0) {
                          <div class="empty-state">No se encontraron datos.</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
            
            @if (isLoading) {
              <div class="msg-row ai">
                <div class="msg-avatar">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </div>
                <div class="msg-content">
                  <div class="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Input Area flotante -->
          <div class="input-container">
            <div class="input-box">
              <button class="mic-btn" [class.recording]="isRecording" (click)="toggleRecording()" title="Dictar por voz">
                @if (isRecording) {
                  <!-- Stop Icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><rect width="12" height="12" x="6" y="6" rx="2"/></svg>
                } @else {
                  <!-- Mic Icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                }
              </button>
              
              <textarea 
                [(ngModel)]="prompt" 
                (keydown.enter)="onEnter($event)"
                placeholder="Ej. Trámites con riesgo de demora..." 
                [disabled]="isLoading"
                rows="1">
              </textarea>
              
              <button class="send-btn" (click)="solicitarReporte()" [disabled]="isLoading || !prompt.trim()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </div>
            <div class="input-footer">
              <p>WorkEntAI Analista utiliza modelos avanzados y puede cometer errores. Verifica los datos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-layout { display: flex; height: 100vh; overflow: hidden; background: #ffffff; }
    .main-content { flex: 1; display: flex; justify-content: center; position: relative; }
    
    .text-blue-600 { color: #2563eb; }
    .text-indigo-600 { color: #4f46e5; }
    .text-red-600 { color: #dc2626; }

    .chat-wrapper {
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .chat-history {
      flex: 1;
      padding: 40px 20px 120px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 30px;
      scroll-behavior: smooth;
    }

    .msg-row { display: flex; gap: 20px; width: 100%; }
    .msg-row.user { flex-direction: row-reverse; }
    
    .msg-avatar {
      width: 38px; height: 38px; min-width: 38px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: #f1f5f9;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
      color: #475569;
    }
    .msg-row.user .msg-avatar { background: #e0f2fe; border-color: #bae6fd; }

    .msg-content {
      max-width: 85%;
      font-size: 16px; line-height: 1.6;
      color: #334155;
    }
    
    .msg-row.user .msg-content {
      background: #f1f5f9;
      padding: 14px 20px;
      border-radius: 20px;
      border-top-right-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }

    .msg-text { margin: 0; white-space: pre-wrap; font-family: 'Inter', system-ui, sans-serif; }

    /* Report Card & Table */
    .report-card {
      margin-top: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    
    .report-header {
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
    }
    .report-header h4 { margin: 0; color: #0f172a; font-weight: 600; font-family: 'Inter', system-ui, sans-serif; }
    
    .report-actions { display: flex; gap: 10px; }
    .action-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: 1px solid transparent; transition: all 0.2s;
    }
    .excel-btn { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }
    .excel-btn:hover { background: #e0e7ff; }
    .word-btn { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
    .word-btn:hover { background: #dcfce7; }
    .pdf-btn { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
    .pdf-btn:hover { background: #fee2e2; }

    .table-container { overflow-x: auto; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 14px; font-family: 'Inter', system-ui, sans-serif; }
    .report-table th { background: #ffffff; color: #64748b; font-weight: 600; text-align: left; padding: 14px 20px; border-bottom: 2px solid #e2e8f0; }
    .report-table td { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .report-table tr:hover td { background: #f8fafc; }
    .empty-state { text-align: center; padding: 24px; color: #94a3b8; font-style: italic; }

    /* Input Area */
    .input-container {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 24px;
      background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,1) 100%);
      display: flex; flex-direction: column; align-items: center;
      backdrop-filter: blur(8px);
    }
    
    .input-box {
      width: 100%; max-width: 800px;
      background: white; border: 1px solid #cbd5e1; border-radius: 30px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.06);
      display: flex; align-items: center; padding: 10px 14px;
      gap: 12px; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-box:focus-within {
      border-color: #94a3b8;
      box-shadow: 0 8px 30px rgba(0,0,0,0.1);
    }
    
    .input-box textarea {
      flex: 1; border: none; outline: none; resize: none;
      padding: 12px 0; font-size: 15px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b;
      max-height: 120px; overflow-y: auto;
    }
    .input-box textarea::placeholder { color: #94a3b8; }
    
    .mic-btn {
      width: 42px; height: 42px; border-radius: 50%; border: none;
      background: transparent; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; color: #64748b;
    }
    .mic-btn:hover { background: #f1f5f9; color: #334155; }
    .mic-btn.recording { background: #fee2e2; color: #dc2626; animation: pulse 1.5s infinite; border: 1px solid #fca5a5; }
    @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239,68,68,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0); } }

    .send-btn {
      width: 42px; height: 42px; border-radius: 50%; border: none;
      background: #0f172a; color: white; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .send-btn:hover:not(:disabled) { background: #334155; transform: scale(1.05); }
    .send-btn:active:not(:disabled) { transform: scale(0.95); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .input-footer { margin-top: 12px; text-align: center; }
    .input-footer p { margin: 0; font-size: 12px; color: #94a3b8; font-family: 'Inter', system-ui, sans-serif; }

    /* Typing Indicator */
    .typing-indicator { display: flex; gap: 6px; padding: 14px 20px; background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0; width: fit-content; }
    .typing-indicator span { width: 8px; height: 8px; background: #94a3b8; border-radius: 50%; animation: blink 1.4s infinite both; }
    .typing-indicator span:nth-child(1) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.4s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.6s; }
    @keyframes blink { 0% { opacity: 0.2; transform: scale(0.8); } 20% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.2; transform: scale(0.8); } }
  `]
})
export class ReportesDinamicosComponent implements OnInit, OnDestroy {
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  
  prompt = '';
  isLoading = false;
  isRecording = false;
  recognition: any;

  mensajes: {text: string, isUser: boolean, reporte?: any}[] = [
    {
      text: '¡Hola! Soy el Asistente Analítico de WorkEntAI.\nPuedes pedirme reportes en lenguaje natural o usar tu voz.\n\nPor ejemplo:\n- "Muéstrame la eficiencia de los funcionarios"\n- "Trámites con riesgo de demora"', 
      isUser: false
    }
  ];

  navItems = ADMIN_NAV_ITEMS;

  ngOnInit() {
    this.initSpeechRecognition();
  }

  ngOnDestroy() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'es-ES';

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.cdr.detectChanges();
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.prompt += (this.prompt ? ' ' : '') + transcript;
        this.cdr.detectChanges();
      };

      this.recognition.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event.error);
        this.isRecording = false;
        this.cdr.detectChanges();
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.cdr.detectChanges();
      };
    } else {
      console.warn('El reconocimiento de voz no está soportado en este navegador.');
    }
  }

  toggleRecording() {
    if (!this.recognition) {
      alert('Tu navegador no soporta el reconocimiento de voz (Usa Chrome o Edge).');
      return;
    }
    
    if (this.isRecording) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

  onEnter(event: Event) {
    event.preventDefault();
    this.solicitarReporte();
  }

  solicitarReporte() {
    if (!this.prompt.trim()) return;
    const reqPrompt = this.prompt.trim();
    
    this.mensajes.push({ text: reqPrompt, isUser: true });
    this.prompt = '';
    this.isLoading = true;
    this.scrollToBottom();

    this.http.post<any>(`${environment.apiUrl}/reportes/generar`, { prompt: reqPrompt }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 'ACLARACION') {
          this.mensajes.push({ text: res.mensaje || 'No te he entendido del todo. ¿Podrías ser más específico?', isUser: false });
        } else if (res.status === 'OK') {
          this.mensajes.push({ 
            text: res.mensaje || 'Aquí tienes tu reporte generado:', 
            isUser: false,
            reporte: res 
          });
        } else {
          this.mensajes.push({ text: res.mensaje || 'Hubo un error procesando el reporte.', isUser: false });
        }
        this.scrollToBottom();
      },
      error: (err) => {
        this.isLoading = false;
        this.mensajes.push({ text: 'Error de conexión con el Asistente AI.', isUser: false });
        this.scrollToBottom();
      }
    });
  }

  descargarArchivo(reporteId: string, tipo: string) {
    if (!reporteId) return;
    this.http.get(`${environment.apiUrl}/reportes/${reporteId}/${tipo}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-workentai-${reporteId.substring(0,8)}.${tipo === 'excel' ? 'xlsx' : tipo === 'word' ? 'docx' : 'pdf'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error(`Error descargando ${tipo}:`, err);
        alert(`No se pudo descargar el archivo ${tipo.toUpperCase()}`);
      }
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.chat-history');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
