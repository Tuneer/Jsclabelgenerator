import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { PosItem } from '../models/pos-item.model';
import { LocalPosDbService } from './local-pos-db.service';

@Injectable({ providedIn: 'root' })
export class PosSyncService {
  private readonly AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  private readonly itemsSubject = new BehaviorSubject<PosItem[]>([]);
  readonly items$: Observable<PosItem[]> = this.itemsSubject.asObservable();

  private readonly lastSyncSubject = new BehaviorSubject<Date | null>(null);
  readonly lastSync$: Observable<Date | null> = this.lastSyncSubject.asObservable();

  private readonly syncingSubject = new BehaviorSubject<boolean>(false);
  readonly syncing$: Observable<boolean> = this.syncingSubject.asObservable();

  private readonly printedHistorySubject = new BehaviorSubject<PosItem[]>([]);
  readonly printedHistory$: Observable<PosItem[]> = this.printedHistorySubject.asObservable();

  constructor(private localDb: LocalPosDbService) {
    this.syncFromLocalDb();
    this.loadPrintedHistory();
    timer(this.AUTO_SYNC_INTERVAL_MS, this.AUTO_SYNC_INTERVAL_MS).subscribe(() => this.syncFromLocalDb());
  }

  manualSync(): void {
    this.syncFromLocalDb();
  }

  async updateFromImport(items: PosItem[]): Promise<void> {
    console.log('📥 PosSyncService: Importing', items.length, 'items');
    await this.localDb.saveAll(items);
    this.itemsSubject.next(items);
    this.lastSyncSubject.next(new Date());
    this.syncingSubject.next(false);
    console.log('✅ PosSyncService: Import complete, items observable updated');
  }

  async markItemsPrinted(items: PosItem[]): Promise<void> {
    if (!items.length) {
      return;
    }
    await this.localDb.appendPrintedItems(items);
    await this.localDb.upsertItems(items);
    await this.syncFromLocalDb();
    await this.loadPrintedHistory();
  }

  private async syncFromLocalDb(): Promise<void> {
    this.syncingSubject.next(true);
    const items = await this.localDb.getAll();
    console.log('🔄 PosSyncService: Syncing from local DB, found', items.length, 'items');
    this.itemsSubject.next(items);
    this.lastSyncSubject.next(new Date());
    this.syncingSubject.next(false);
  }

  private async loadPrintedHistory(): Promise<void> {
    const history = await this.localDb.getPrintedHistory();
    this.printedHistorySubject.next(history);
  }
}
