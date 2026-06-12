import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SidebarComponent, NavItem, ADMIN_NAV_ITEMS } from '../../../components/sidebar/sidebar.component';
import { TramiteService } from '../../../services/tramite/tramite.service';
import { Tramite } from '../../../models/models';

@Component({
  selector: 'app-admin-tramites',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './admin-tramites.component.html',
  styleUrls: ['../admin.component.css'] // Reutilizamos los estilos premium
})
export class AdminTramitesComponent implements OnInit {
  tramites: Tramite[] = [];
  filteredTramites: Tramite[] = [];
  loading = false;
  
  searchTerm = '';
  statusFilter = '';
  
  private tramiteService = inject(TramiteService);
  public router = inject(Router);

  navItems = ADMIN_NAV_ITEMS;

  ngOnInit(): void {
    this.loadTramites();
  }

  loadTramites(): void {
    this.loading = true;
    this.tramiteService.getAll().subscribe({
      next: (data: Tramite[]) => {
        this.tramites = data;
        this.filteredTramites = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filter(event?: Event): void {
    if (event) {
      this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    }
    
    this.filteredTramites = this.tramites.filter(t => {
      // Búsqueda en todas las columnas
      const term = this.searchTerm;
      const matchSearch = 
        t.id.toLowerCase().includes(term) || 
        (t.numeroReferencia || '').toLowerCase().includes(term) ||
        (t.clienteId || '').toLowerCase().includes(term) ||
        (t.nombreCliente || '').toLowerCase().includes(term) ||
        (t.politicaId || '').toLowerCase().includes(term) ||
        (t.nombrePolitica || '').toLowerCase().includes(term) ||
        (t.descripcion || '').toLowerCase().includes(term);

      // Filtro por estado
      let matchStatus = true;
      if (this.statusFilter === 'DEMORA') {
        matchStatus = this.isDelayed(t);
      } else if (this.statusFilter) {
        matchStatus = t.estado === this.statusFilter;
      }

      return matchSearch && matchStatus;
    });
  }

  isDelayed(t: Tramite): boolean {
    if (t.estado === 'COMPLETADO' || t.estado === 'RECHAZADO') return false;
    // Si la prioridad es ALTA o lleva mucho tiempo, se considera en demora
    if (t.prioridad === 'ALTA') return true;
    
    // Simulación: más de 3 días = demora
    const created = new Date(t.fechaInicio).getTime();
    const now = new Date().getTime();
    const diffDays = (now - created) / (1000 * 3600 * 24);
    return diffDays > 3;
  }

  setStatus(status: string): void {
    this.statusFilter = status;
    this.filter();
  }

  badgeClass(estado: string): string {
    switch (estado) {
      case 'NUEVO': return 'badge-borrador'; // Amarillo/Naranja
      case 'EN_PROCESO': return 'badge-activa'; // Verde
      case 'COMPLETADO': return 'badge-inactiva'; // Gris oscuro / o Azul
      case 'RECHAZADO': return 'badge-inactiva'; // Rojo
      default: return 'badge-inactiva';
    }
  }
}
