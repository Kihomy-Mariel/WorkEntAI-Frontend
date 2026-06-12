import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, fromEvent, merge, of, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SyncRequest {
  id?: number;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private http = inject(HttpClient);
  
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.onlineSubject.asObservable();
  
  private dbName = 'WorkEntAIOfflineDB';
  private storeName = 'syncQueue';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDatabase();
    this.setupNetworkListeners();
  }

  private initDatabase() {
    const request = indexedDB.open(this.dbName, 1);
    
    request.onerror = (event) => console.error('IndexedDB error:', event);
    
    request.onupgradeneeded = (event: any) => {
      this.db = event.target.result;
      if (!this.db!.objectStoreNames.contains(this.storeName)) {
        this.db!.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event: any) => {
      this.db = event.target.result;
      if (this.onlineSubject.value) {
        this.syncPendingRequests();
      }
    };
  }

  private setupNetworkListeners() {
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).subscribe(isOnline => {
      this.onlineSubject.next(isOnline);
      if (isOnline) {
        this.syncPendingRequests();
      }
    });
  }

  public get isOnline(): boolean {
    return this.onlineSubject.value;
  }

  // Intercept and queue requests if offline
  public queueRequest(url: string, method: string, body: any): Promise<void> {
    if (!this.db) return Promise.reject('DB not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const req: SyncRequest = {
        url,
        method,
        body,
        timestamp: Date.now()
      };
      
      const addRequest = store.add(req);
      
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject('Error queueing request');
    });
  }

  private syncPendingRequests() {
    if (!this.db) return;
    
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const requests: SyncRequest[] = getAllRequest.result;
      if (requests.length === 0) return;
      
      console.log(`[OfflineSync] Sincronizando ${requests.length} peticiones pendientes...`);
      
      // Ordenar por timestamp (Last Write Wins ya se aplica por orden cronológico natural al backend)
      requests.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const req of requests) {
        this.executeRequest(req).subscribe({
          next: () => this.removeRequestFromQueue(req.id!),
          error: (err) => console.error(`[OfflineSync] Error sincronizando req ${req.id}:`, err)
        });
      }
    };
  }

  private executeRequest(req: SyncRequest): Observable<any> {
    if (req.method.toUpperCase() === 'POST') {
      return this.http.post(req.url, req.body);
    } else if (req.method.toUpperCase() === 'PUT') {
      return this.http.put(req.url, req.body);
    } else if (req.method.toUpperCase() === 'DELETE') {
      return this.http.delete(req.url);
    }
    return of(null);
  }

  private removeRequestFromQueue(id: number) {
    if (!this.db) return;
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    store.delete(id);
  }
}
