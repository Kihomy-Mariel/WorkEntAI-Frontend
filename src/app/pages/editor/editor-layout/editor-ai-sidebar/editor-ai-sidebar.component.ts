import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorStateService } from '../../editor-state.service';
import { AIService } from '../../../../services/ai/ai.service';

interface ChatMessage { role: 'user' | 'ai'; text: string; }

@Component({
  selector: 'app-editor-ai-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-sidebar glass-panel">
      <div class="sidebar-header">
        <div class="ai-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"/></svg>
        </div>
        <h3 class="stitle">Asistente IA</h3>
      </div>
      
      <div class="chat-msgs scroll-y" #chatContainer>
        @for (msg of chatMessages; track $index) {
          <div [class]="'cmsg ' + msg.role">
            <span class="cbubble">{{ msg.text }}</span>
          </div>
        }
        @if (aiLoading) { 
          <div class="cmsg ai">
            <span class="cbubble loading">
              <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
            </span>
          </div> 
        }
      </div>

      <div class="quick-prompts">
        <button class="btn-q" (click)="sendQuickPrompt('Agrega un departamento Legal')">+ Depto</button>
        <button class="btn-q" (click)="sendQuickPrompt('Agrega una tarea de Revisión')">+ Tarea</button>
        <button class="btn-q" (click)="sendQuickPrompt('Crea flujo de Aprobación')">Flujo</button>
      </div>

      <div class="chat-input-area">
        <div class="input-wrapper">
          <input class="chat-input" [(ngModel)]="chatInput" placeholder="Describe cambios..." (keydown.enter)="sendChat()" />
          <button class="btn-mic" [class.recording]="isRecording" (click)="toggleVoice()" title="Dictar por voz">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
            @if (isRecording) { <span class="mic-waves"></span> }
          </button>
          <button class="btn-send" (click)="sendChat()" [disabled]="!chatInput.trim() || aiLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .ai-sidebar { width: 300px; height: 100%; flex-shrink: 0; display: flex; flex-direction: column; border-left: 1px solid var(--border); z-index: 5; background: var(--bg); }
    .sidebar-header { padding: 14px 20px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 10px; }
    .ai-avatar { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--purple)); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); }
    .stitle { font-size: 14px; font-weight: 700; color: var(--text); margin: 0; }
    
    .scroll-y { overflow-y: auto; }
    .chat-msgs { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .cmsg { display: flex; animation: slideIn 0.2s ease-out; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .cmsg.user { justify-content: flex-end; }
    .cmsg.ai { justify-content: flex-start; }
    .cbubble { max-width: 90%; padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .cmsg.user .cbubble { background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff; border-bottom-right-radius: 4px; }
    .cmsg.ai .cbubble { background: var(--bg-2); color: var(--text); border-bottom-left-radius: 4px; border: 1px solid var(--border-2); }
    
    .loading { display: flex; gap: 4px; padding: 12px 16px; align-items: center; }
    .typing-dot { width: 6px; height: 6px; background: var(--text-faint); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px; border-top: 1px solid var(--border); background: var(--bg); }
    .btn-q { background: var(--bg-2); border: 1px solid var(--border-2); color: var(--text-muted); border-radius: 12px; padding: 4px 10px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; }
    .btn-q:hover { background: hsl(216, 85%, 57%, 0.1); border-color: var(--primary); color: var(--primary); }
    
    .chat-input-area { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg); }
    .input-wrapper { display: flex; align-items: center; background: var(--card); border: 1px solid var(--border-2); border-radius: 20px; padding: 4px 6px; transition: border-color 0.2s; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02); }
    .input-wrapper:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px hsl(216, 85%, 57%, 0.15); }
    .chat-input { flex: 1; border: none; background: transparent; padding: 8px 10px; font-size: 13px; outline: none; color: var(--text); font-family: inherit; }
    
    .btn-mic, .btn-send { background: transparent; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: var(--text-muted); position: relative; }
    .btn-mic:hover { color: var(--primary); background: var(--bg-2); }
    .btn-send { color: #fff; background: var(--primary); margin-left: 4px; }
    .btn-send:hover:not(:disabled) { background: var(--accent); transform: scale(1.05); }
    .btn-send:disabled { background: var(--border-2); color: var(--text-faint); cursor: not-allowed; }
    
    .btn-mic.recording { color: var(--danger); }
    .mic-waves { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--danger); animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
    @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
  `]
})
export class EditorAiSidebarComponent {
  state = inject(EditorStateService);
  aiService = inject(AIService);

  chatMessages: ChatMessage[] = [{ role: 'ai', text: '¡Hola! Describe los cambios que quieres hacer al diagrama. Puedo agregar departamentos, tareas, y flujos completos.' }];
  chatInput = '';
  aiLoading = false;
  isRecording = false;

  sendChat(): void {
    const prompt = this.chatInput.trim();
    if (!prompt || this.aiLoading) return;
    
    this.chatMessages.push({ role: 'user', text: prompt });
    this.chatInput = '';
    this.aiLoading = true;
    
    this.aiService.procesarPromptDiagrama(prompt).subscribe({
      next: (resp) => { 
        this.aiLoading = false; 
        this.applyAiResponse(resp); 
      },
      error: () => { 
        this.aiLoading = false; 
        this.chatMessages.push({ role: 'ai', text: 'Ocurrió un error al contactar la IA. Por favor, intenta de nuevo.'});
      },
    });
  }

  sendQuickPrompt(prompt: string): void { 
    this.chatInput = prompt; 
    this.sendChat(); 
  }

  private applyAiResponse(resp: string): void {
    const cleaned = resp.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    try {
      const js = cleaned.indexOf('{'); const je = cleaned.lastIndexOf('}');
      if (js === -1 || je === -1) { 
        this.chatMessages.push({ role: 'ai', text: resp });
        return; 
      }
      const parsed = JSON.parse(cleaned.substring(js, je + 1));
      
      const mensaje: string = parsed.mensaje || parsed.message || 'Diagrama actualizado.';
      this.chatMessages.push({ role: 'ai', text: mensaje });

      // Pasar los datos parseados al componente canvas mediante el estado
      if ((parsed.nodos && parsed.nodos.length > 0) || (parsed.nodes && parsed.nodes.length > 0) || 
          (parsed.links && parsed.links.length > 0) || (parsed.enlaces && parsed.enlaces.length > 0)) {
        this.state.triggerAiDiagramUpdate.set(parsed);
      }
    } catch (e) {
      this.chatMessages.push({ role: 'ai', text: cleaned });
    }
  }

  toggleVoice() {
    this.isRecording = !this.isRecording;
    if (this.isRecording) {
      this.chatInput = 'Escuchando...';
      setTimeout(() => {
        this.isRecording = false;
        this.chatInput = 'Agregar tarea de revisión técnica'; // Simulación
      }, 3000);
    } else {
      this.chatInput = '';
    }
  }
}
