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

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <nav class="wf-sidebar">
      <div class="wf-logo">
        <div class="wf-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
            <rect x="9" y="9" width="6" height="6"/>
            <line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/>
            <line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/>
            <line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/>
            <line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/>
          </svg>
        </div>
        <span class="wf-logo-text">WorkEntAI</span>
      </div>

      <p class="wf-nav-label">NAVEGACIÓN</p>
      <ul class="wf-nav-list">
        @for (item of navItems; track item.route) {
          <li class="wf-nav-item" [class.active]="activeRoute === item.route"
              (click)="router.navigate([item.route])">
            <span class="wf-nav-icon">{{ item.icon }}</span>
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
            {{ isDark() ? '☀️' : '🌙' }}
          </button>
          <button class="wf-logout-btn" (click)="logout()">🚪 Salir</button>
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
