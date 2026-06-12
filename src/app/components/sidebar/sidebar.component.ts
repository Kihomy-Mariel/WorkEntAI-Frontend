import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { ThemeService } from '../../services/theme/theme.service';

export interface NavItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { icon: 'ph ph-squares-four', label: 'Panel Principal', route: '/admin' },
  { icon: 'ph ph-briefcase', label: 'Políticas', route: '/admin/politicas' },
  { icon: 'ph ph-files', label: 'Trámites', route: '/admin/tramites' },
  { icon: 'ph ph-chart-line-up', label: 'Reportes IA', route: '/admin/reportes' },
  { icon: 'ph ph-trend-up', label: 'Analytics & KPIs', route: '/analytics' },
  { icon: 'ph ph-warning-circle', label: 'Cuellos de Botella', route: '/admin/cuellos-botella' },
  { icon: 'ph ph-pen-nib', label: 'Editor de Políticas', route: '/editor' },
  { icon: 'ph ph-users', label: 'Usuarios', route: '/users' },
  { icon: 'ph ph-user-circle', label: 'Mi Perfil', route: '/perfil' },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <nav class="wf-sidebar">
      <div class="wf-logo">
        <div class="wf-logo-icon" style="background: transparent;">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="url(#brandGrad)"/>
            <path d="M12 20L20 12L28 20L20 28L12 20Z" fill="white" fill-opacity="0.2"/>
            <circle cx="20" cy="20" r="4" fill="white"/>
            <path d="M8 20H12M28 20H32M20 8V12M20 28V32" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stop-color="#3b82f6"/>
                <stop offset="1" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="wf-logo-text" style="font-size: 18px;">WorkEntAI</span>
      </div>

      <p class="wf-nav-label">NAVEGACIÓN</p>
      <ul class="wf-nav-list">
        @for (item of navItems; track item.route) {
          <li class="wf-nav-item" [class.active]="activeRoute === item.route"
              (click)="router.navigate([item.route])">
            <i class="wf-nav-icon" [ngClass]="item.icon"></i>
            <span class="wf-nav-text">{{ item.label }}</span>
            @if (item.badge && item.badge > 0) {
              <span class="wf-nav-badge">{{ item.badge }}</span>
            }
          </li>
        }
      </ul>

      <div class="wf-sidebar-footer">
        <div class="wf-user-card">
          <div class="wf-user-avatar">{{ user?.nombre?.charAt(0)?.toUpperCase() || '?' }}</div>
          <div class="wf-user-info">
            <p class="wf-user-name">{{ user?.nombre || 'Usuario' }}</p>
            <p class="wf-user-role">{{ user?.rol || '' }}</p>
          </div>
        </div>
        <div class="wf-footer-actions">
          <button class="wf-theme-btn" (click)="toggleTheme()"
            [title]="isDark() ? 'Modo claro' : 'Modo oscuro'">
            <i [class]="isDark() ? 'ph ph-sun' : 'ph ph-moon'"></i>
          </button>
          <button class="wf-logout-btn" (click)="logout()"><i class="ph ph-sign-out"></i> Salir</button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .wf-sidebar {
      width: 220px;
      background: #1e293b;
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 20px;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      height: 100vh;
    }
    .wf-logo {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 28px;
    }
    .wf-logo-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .wf-logo-text {
      font-size: 16px; font-weight: 700; color: #f1f5f9;
    }
    .wf-nav-label {
      font-size: 9px; color: rgba(255,255,255,0.3);
      letter-spacing: 0.1em; margin: 0 0 8px;
    }
    .wf-nav-list { list-style: none; padding: 0; margin: 0; flex: 1; }
    .wf-nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 8px; cursor: pointer;
      font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 4px;
      transition: background 0.2s, color 0.2s;
      position: relative;
    }
    .wf-nav-item:hover {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.9);
    }
    .wf-nav-item.active {
      background: rgba(59,130,246,0.2);
      color: #93c5fd;
      font-weight: 600;
    }
    .wf-nav-icon { font-size: 16px; flex-shrink: 0; }
    .wf-nav-text { flex: 1; }
    .wf-nav-badge {
      background: #ef4444; color: white;
      border-radius: 10px; padding: 1px 6px;
      font-size: 10px; font-weight: 700;
    }
    .wf-sidebar-footer { margin-top: auto; }
    .wf-user-card {
      display: flex; align-items: center; gap: 10px;
      padding: 12px; background: rgba(255,255,255,0.05);
      border-radius: 10px; margin-bottom: 8px;
    }
    .wf-user-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; font-size: 13px; color: white; flex-shrink: 0;
    }
    .wf-user-info { min-width: 0; }
    .wf-user-name {
      font-size: 12px; font-weight: 600; margin: 0;
      color: rgba(255,255,255,0.85);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .wf-user-role {
      font-size: 10px; color: rgba(255,255,255,0.4); margin: 0;
    }
    .wf-footer-actions { display: flex; gap: 8px; align-items: center; }
    .wf-theme-btn {
      width: 34px; height: 34px; border-radius: 8px;
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 16px; transition: all 0.2s; flex-shrink: 0;
    }
    .wf-theme-btn:hover { background: rgba(255,255,255,0.12); }
    .wf-logout-btn {
      flex: 1; padding: 8px; background: none;
      border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4);
      border-radius: 8px; cursor: pointer; font-size: 12px;
      font-family: 'Space Grotesk', sans-serif; transition: all 0.2s;
    }
    .wf-logout-btn:hover { border-color: #ef4444; color: #ef4444; }
    @media (max-width: 900px) {
      .wf-sidebar { width: 60px; padding: 12px 8px; }
      .wf-logo-text, .wf-nav-label, .wf-nav-text,
      .wf-user-info, .wf-logout-btn { display: none; }
      .wf-nav-item { justify-content: center; padding: 10px; }
      .wf-user-card { justify-content: center; }
      .wf-footer-actions { justify-content: center; }
    }
    @media (max-width: 600px) {
      .wf-sidebar { display: none; }
    }
    
    /* ========================================= */
    /* LIGHT THEME OVERRIDES                     */
    /* ========================================= */
    :host-context([data-theme="light"]) .wf-sidebar {
      background: #f8fafc;
      border-right-color: rgba(0,0,0,0.06);
    }
    :host-context([data-theme="light"]) .wf-logo-text { color: #1e293b; }
    :host-context([data-theme="light"]) .wf-nav-label { color: #94a3b8; }
    :host-context([data-theme="light"]) .wf-nav-item { color: #64748b; }
    :host-context([data-theme="light"]) .wf-nav-item:hover { background: rgba(0,0,0,0.04); color: #0f172a; }
    :host-context([data-theme="light"]) .wf-nav-item.active { background: rgba(59,130,246,0.1); color: #2563eb; font-weight: 600; }
    
    :host-context([data-theme="light"]) .wf-user-card { background: rgba(0,0,0,0.03); }
    :host-context([data-theme="light"]) .wf-user-name { color: #1e293b; }
    :host-context([data-theme="light"]) .wf-user-role { color: #64748b; }
    
    :host-context([data-theme="light"]) .wf-theme-btn { 
      background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.05); color: #475569;
    }
    :host-context([data-theme="light"]) .wf-theme-btn:hover { background: rgba(0,0,0,0.08); }
    
    :host-context([data-theme="light"]) .wf-logout-btn { 
      border-color: rgba(0,0,0,0.1); color: #64748b; 
    }
    :host-context([data-theme="light"]) .wf-logout-btn:hover { border-color: #ef4444; color: #ef4444; }
  `]
})
export class SidebarComponent {
  @Input() activeRoute = '';
  @Input() navItems: NavItem[] = [];

  constructor(
    public router: Router,
    private authService: AuthService,
    private themeService: ThemeService
  ) {}

  get user() { return this.authService.getUser(); }
  isDark = () => this.themeService.isDark();

  toggleTheme(): void { this.themeService.toggle(); }
  logout(): void { this.authService.logout(); }
}
