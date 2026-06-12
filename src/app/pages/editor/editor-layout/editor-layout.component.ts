import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EditorToolbarComponent } from './editor-toolbar/editor-toolbar.component';
import { EditorCanvasComponent } from './editor-canvas/editor-canvas.component';
import { EditorPropertiesComponent } from './editor-properties/editor-properties.component';
import { EditorAiSidebarComponent } from './editor-ai-sidebar/editor-ai-sidebar.component';
import { EditorStateService } from '../editor-state.service';

@Component({
  selector: 'app-editor-layout',
  standalone: true,
  imports: [
    CommonModule,
    EditorToolbarComponent,
    EditorCanvasComponent,
    EditorPropertiesComponent,
    EditorAiSidebarComponent
  ],
  template: `
    <div class="editor-root">
      <app-editor-toolbar></app-editor-toolbar>
      <div class="main-area">
        @if (state.propertiesOpen()) {
          <app-editor-properties></app-editor-properties>
        }
        <app-editor-canvas></app-editor-canvas>
        @if (state.aiSidebarOpen()) {
          <app-editor-ai-sidebar></app-editor-ai-sidebar>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .editor-root { 
      display: flex; 
      flex-direction: column; 
      height: 100vh; 
      background: var(--bg); 
    }
    .main-area { 
      display: flex; 
      flex: 1; 
      overflow: hidden; 
      position: relative;
    }
  `]
})
export class EditorLayoutComponent implements OnInit, OnDestroy {
  state = inject(EditorStateService);
  
  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.state.reset();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.state.politicaId.set(id);
    }
  }

  ngOnDestroy() {
    this.state.reset();
  }
}
