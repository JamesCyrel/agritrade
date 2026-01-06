import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

/**
 * SyncService handles one-way data synchronization from Supabase (primary) to local PostgreSQL (replica).
 * 
 * This ensures the local read cache stays up-to-date with the primary database.
 */
@Injectable()
export class SyncService implements OnModuleInit {
    private syncInterval: NodeJS.Timeout | null = null;
    private isSyncing = false;

    // Tables to sync in dependency order
    private readonly tables = [
        'users',
        'profiles',
        'verification_documents',
        'products',
        'product_images',
        'product_sack_sizes',
        'consumer_addresses',
        'payment_methods',
        'consumer_payment_methods',
        'consumer_favorites',
        'favorites',
        'cart_items',
        'orders',
        'order_items',
        'order_rejections',
        'payment_transactions',
        'farmer_ledger',
        'farmer_payouts',
        'commission_settings',
        'delivery_fee_settings',
        'cod_settings',
        'cod_eligibility',
        'reviews',
        'disputes',
        'notifications',
        'promo_codes',
        'featured_farmers',
    ];

    constructor(
        @Inject('PRIMARY_POOL') private readonly primaryPool: Pool,
        @Inject('REPLICA_POOL') private readonly replicaPool: Pool,
        private readonly configService: ConfigService,
    ) { }

    async onModuleInit() {
        const syncEnabled = this.configService.get<string>('SYNC_ENABLED', 'false') === 'true';
        const syncIntervalMs = parseInt(this.configService.get<string>('SYNC_INTERVAL_MS', '60000'), 10);

        if (syncEnabled) {
            console.log(`🔄 Sync service enabled - syncing every ${syncIntervalMs / 1000}s`);
            await this.syncAll();
            this.syncInterval = setInterval(() => this.syncAll(), syncIntervalMs);
        } else {
            console.log('🔄 Sync service disabled - set SYNC_ENABLED=true to enable');
        }
    }

    /**
     * Sync all tables from primary to replica
     */
    async syncAll(): Promise<void> {
        if (this.isSyncing) {
            console.log('⏳ Sync already in progress, skipping...');
            return;
        }

        this.isSyncing = true;
        console.log('🔄 Starting full sync from Supabase to local...');

        try {
            for (const table of this.tables) {
                await this.syncTable(table);
            }
            console.log('✅ Full sync completed');
        } catch (error) {
            console.error('❌ Sync failed:', error.message);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync a single table from primary to replica
     */
    async syncTable(tableName: string): Promise<void> {
        try {
            // Get all data from primary
            const result = await this.primaryPool.query(`SELECT * FROM ${tableName}`);

            if (result.rows.length === 0) {
                return;
            }

            // Clear local table and insert fresh data
            await this.replicaPool.query(`DELETE FROM ${tableName}`);

            // Build bulk insert
            const columns = Object.keys(result.rows[0]);
            const placeholders = result.rows.map((_, rowIndex) =>
                `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
            ).join(', ');

            const values = result.rows.flatMap(row => columns.map(col => row[col]));

            await this.replicaPool.query(
                `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`,
                values
            );

            console.log(`  ✓ ${tableName}: ${result.rows.length} rows synced`);
        } catch (error) {
            console.error(`  ✗ ${tableName}: ${error.message}`);
        }
    }

    /**
     * Sync specific tables after a write operation
     */
    async syncAfterWrite(tables: string[]): Promise<void> {
        for (const table of tables) {
            await this.syncTable(table);
        }
    }

    /**
     * Stop the sync interval (for cleanup)
     */
    stopSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
}
