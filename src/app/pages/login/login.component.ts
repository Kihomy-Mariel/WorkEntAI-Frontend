import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">

      <!-- Animated background blobs -->
      <div class="blob blob-blue"></div>
      <div class="blob blob-purple"></div>
      <div class="blob blob-cyan"></div>

      <div class="login-wrapper">

        <!-- Logo / Brand -->
        <div class="brand">
          <div class="brand-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20L20 12L28 20L20 28L12 20Z" fill="white" fill-opacity="0.3"/>
              <circle cx="20" cy="20" r="4" fill="white"/>
              <path d="M8 20H12M28 20H32M20 8V12M20 28V32" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h1 class="brand-name">WorkEntAI</h1>
          <p class="brand-sub">
            <span class="sparkle">✦</span>
             Gestión Inteligente
          </p>
        </div>

        <!-- Card -->
        <div class="card">
          <h2 class="card-title">Iniciar Sesión</h2>

          <!-- Email -->
          <div class="field">
            <label>Correo Electrónico</label>
            <div class="input-wrap">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <input type="email" [(ngModel)]="email" placeholder="usuario@cotasenergy.com" class="input-field"/>
            </div>
          </div>

          <!-- Password -->
          <div class="field">
            <label>Contraseña</label>
            <div class="input-wrap">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input type="password" [(ngModel)]="password" placeholder="••••••••" class="input-field"/>
            </div>
          </div>

          <!-- Submit -->
          <button class="btn-login" (click)="login()" [disabled]="loading">
            @if (loading) {
              <span class="spinner"></span> Iniciando...
            } @else {
              Ingresar
            }
          </button>

          <!-- Error -->
          @if (error) {
            <p class="error-msg">{{ error }}</p>
          }

          <p class="forgot">
            ¿Olvidaste tu contraseña?
            <span class="forgot-link">Recuperar</span>
          </p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg);
      font-family: 'Space Grotesk', sans-serif;
      position: relative; overflow: hidden; padding: 16px;
    }

    /* ── Blobs ─────────────────────────────────────────── */
    .blob {
      position: absolute; border-radius: 50%;
      filter: blur(120px); pointer-events: none;
    }
    .blob-blue {
      width: 384px; height: 384px;
      top: 25%; left: -128px;
      background: hsl(216,85%,57%,0.1);
      animation: float 6s ease-in-out infinite;
    }
    .blob-purple {
      width: 384px; height: 384px;
      bottom: 25%; right: -128px;
      background: hsl(282,69%,45%,0.1);
      animation: float 6s ease-in-out infinite;
      animation-delay: 2s;
    }
    .blob-cyan {
      width: 600px; height: 600px;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: hsl(193,88%,48%,0.04);
      filter: blur(150px);
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-20px); }
    }

    /* ── Wrapper ───────────────────────────────────────── */
    .login-wrapper {
      width: 100%; max-width: 420px;
      position: relative; z-index: 10;
      animation: slideIn 0.4s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Brand ─────────────────────────────────────────── */
    .brand { text-align: center; margin-bottom: 32px; }
    .brand-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 80px; height: 80px; border-radius: 20px;
      background: linear-gradient(135deg, var(--primary), var(--purple));
      box-shadow: 0 0 30px hsl(216,85%,57%,0.35);
      margin-bottom: 20px;
    }
    .brand-name {
      font-size: 30px; font-weight: 700; margin: 0 0 8px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .brand-sub {
      font-size: 12px; color: var(--text-muted);
      display: flex; align-items: center; justify-content: center; gap: 6px;
      margin: 0;
    }
    .sparkle { color: var(--accent); font-size: 11px; }

    /* ── Card ──────────────────────────────────────────── */
    .card {
      background: var(--card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      position: relative;
    }
    /* tech-border gradient ring */
    .card::before {
      content: '';
      position: absolute; inset: 0;
      border-radius: 16px; padding: 1px;
      background: linear-gradient(135deg, hsl(216,85%,57%,0.4), hsl(282,69%,45%,0.4));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      pointer-events: none;
    }
    .card-title {
      font-size: 17px; font-weight: 600;
      color: var(--text);
      text-align: center; margin: 0 0 24px;
    }

    /* ── Fields ────────────────────────────────────────── */
    .field { margin-bottom: 18px; }
    .field label {
      display: block; font-size: 11px;
      color: var(--text-muted); margin-bottom: 6px;
      letter-spacing: 0.03em;
    }
    .input-wrap { position: relative; }
    .input-icon {
      position: absolute; left: 12px; top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted); pointer-events: none;
    }
    .input-field {
      width: 100%; padding: 10px 14px 10px 38px;
      background: var(--card-hover);
      border: 1px solid var(--border-2);
      border-radius: 10px; color: var(--text);
      font-size: 13px; font-family: inherit;
      outline: none; box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .input-field::placeholder { color: var(--text-faint); }
    .input-field:focus { border-color: var(--primary); }

    /* ── Button ────────────────────────────────────────── */
    .btn-login {
      width: 100%; padding: 12px;
      background: linear-gradient(135deg, var(--primary), var(--purple));
      color: white; border: none; border-radius: 10px;
      font-size: 14px; font-weight: 600; font-family: inherit;
      cursor: pointer; margin-top: 6px;
      box-shadow: 0 0 20px hsl(216,85%,57%,0.3);
      transition: opacity 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-login:hover:not(:disabled) { opacity: 0.88; }
    .btn-login:disabled { opacity: 0.55; cursor: not-allowed; }

    /* ── Spinner ───────────────────────────────────────── */
    .spinner {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Error ─────────────────────────────────────────── */
    .error-msg {
      color: var(--danger); font-size: 12px;
      text-align: center; margin: 12px 0 0;
      background: hsl(355,88%,64%,0.1);
      border: 1px solid hsl(355,88%,64%,0.25);
      border-radius: 8px; padding: 8px 12px;
    }

    /* ── Forgot ────────────────────────────────────────── */
    .forgot {
      font-size: 11px; color: var(--text-muted);
      text-align: center; margin: 16px 0 0;
    }
    .forgot-link {
      color: var(--accent); cursor: pointer;
    }
    .forgot-link:hover { text-decoration: underline; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

login() {
  this.loading = true;
  this.error = '';
  
  this.authService.login(this.email, this.password).subscribe({
    next: (res) => {
      this.loading = false;
      // Redirect based on role
      if (res.rol === 'ADMIN') {
        this.router.navigate(['/admin']);
      } else if (res.rol === 'FUNCIONARIO') {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/cliente']);
      }
    },
    error: (err) => {
      this.error = err.error?.message || 'Email o contraseña incorrectos';
      this.loading = false;
    }
  });
}
}