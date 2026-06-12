import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SidebarComponent, NavItem, ADMIN_NAV_ITEMS } from '../../../components/sidebar/sidebar.component';
import { PoliticaService } from '../../../services/politica/politica.service';
import { Politica, Nodo } from '../../../models/models';

@Component({
  selector: 'app-admin-politicas',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './admin-politicas.component.html',
  styleUrls: ['../admin.component.css'] // Reutilizamos los estilos premium
})
export class AdminPoliticasComponent implements OnInit {
  politicas: Politica[] = [];
  filteredPoliticas: Politica[] = [];
  loading = false;
  
  searchTerm = '';
  statusFilter = '';
  
  private politicaService = inject(PoliticaService);
  public router = inject(Router);

  showDiagramaModal = false;
  politicaVisualizando: Politica | null = null;

  navItems = ADMIN_NAV_ITEMS;

  // Métricas rápidas
  totalPoliticas = 0;
  activas = 0;
  enBorrador = 0;

  ngOnInit(): void {
    this.loadPoliticas();
  }

  loadPoliticas(): void {
    this.loading = true;
    this.politicaService.getAll().subscribe({
      next: (data: Politica[]) => {
        this.politicas = data;
        this.filteredPoliticas = data;
        this.calculateMetrics();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  calculateMetrics(): void {
    this.totalPoliticas = this.politicas.length;
    this.activas = this.politicas.filter(p => p.estado === 'ACTIVA').length;
    this.enBorrador = this.politicas.filter(p => p.estado === 'BORRADOR').length;
  }

  filter(event?: Event): void {
    if (event) {
      this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    }
    
    this.filteredPoliticas = this.politicas.filter(p => {
      const term = this.searchTerm;
      const matchSearch = 
        p.id.toLowerCase().includes(term) || 
        p.nombre.toLowerCase().includes(term) ||
        (p.descripcion || '').toLowerCase().includes(term) ||
        (p.categoria || '').toLowerCase().includes(term);

      const matchStatus = this.statusFilter ? p.estado === this.statusFilter : true;

      return matchSearch && matchStatus;
    });
  }

  setStatus(status: string): void {
    this.statusFilter = status;
    this.filter();
  }

  badgeClass(estado: string): string {
    switch (estado) {
      case 'BORRADOR': return 'badge-borrador';
      case 'ACTIVA': return 'badge-activa';
      case 'INACTIVA': return 'badge-inactiva';
      default: return 'badge-inactiva';
    }
  }

  togglePolitica(p: Politica): void {
    if (p.estado === 'ACTIVA') {
      this.politicaService.update(p.id, { estado: 'INACTIVA' }).subscribe({
        next: () => {
          p.estado = 'INACTIVA';
          this.calculateMetrics();
        }
      });
    } else {
      this.politicaService.update(p.id, { estado: 'ACTIVA' }).subscribe({
        next: () => {
          p.estado = 'ACTIVA';
          this.calculateMetrics();
        }
      });
    }
  }

  verDiagrama(politica: Politica): void {
    this.politicaVisualizando = politica;
    this.showDiagramaModal = true;
  }

  cerrarDiagrama(): void {
    this.showDiagramaModal = false;
    this.politicaVisualizando = null;
  }

  getSwimlanes(nodos: Nodo[]): { dept: string; nodos: Nodo[] }[] {
    const map = new Map<string, Nodo[]>();
    const sinDept: Nodo[] = [];
    for (const n of nodos) {
      const dept = n.departamento || '';
      if (!dept) { sinDept.push(n); continue; }
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(n);
    }
    const result: { dept: string; nodos: Nodo[] }[] = [];
    if (sinDept.length > 0) result.push({ dept: 'Flujo General', nodos: sinDept });
    map.forEach((ns, dept) => result.push({ dept, nodos: ns }));
    return result;
  }
}
