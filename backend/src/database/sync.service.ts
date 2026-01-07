import { Injectable, Inject, OnModuleInit, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

/**
 * SyncService handles one-way data synchronization from local PostgreSQL (primary) to Supabase (warehouse).
 * 
 * Architecture: Local Primary → Supabase Data Warehouse
 * - All reads/writes happen on local PostgreSQL (fast, low latency)
 * - Data is periodically synced to Supabase for backup/analytics
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
        @Optional() @Inject('WAREHOUSE_POOL') private readonly warehousePool: Pool | null,
        private readonly configService: ConfigService,
    ) { }

    async onModuleInit() {
        const syncEnabled = this.configService.get<string>('SYNC_ENABLED', 'false') === 'true';
        const syncIntervalMs = parseInt(this.configService.get<string>('SYNC_INTERVAL_MS', '60000'), 10);

        if (!this.warehousePool) {
            console.log('📦 Warehouse sync disabled - WAREHOUSE_DB_URL not configured');
            return;
        }

        if (syncEnabled) {
            console.log(`� Warehouse sync enabled - syncing to Supabase every ${syncIntervalMs / 1000}s`);
            // Initial sync after a delay to allow app to start
            setTimeout(() => this.syncToWarehouse(), 5000);
            this.syncInterval = setInterval(() => this.syncToWarehouse(), syncIntervalMs);
        } else {
            console.log('� Warehouse sync disabled - set SYNC_ENABLED=true to enable');
        }
    }

    /**
     * Sync all tables from local (primary) to Supabase (warehouse)
     */
    async syncToWarehouse(): Promise<void> {
        if (!this.warehousePool) {
            console.log('⚠️ Warehouse pool not configured, skipping sync');
            return;
        }

        if (this.isSyncing) {
            console.log('⏳ Sync already in progress, skipping...');
            return;
        }

        this.isSyncing = true;
        console.log('� Starting sync to Supabase warehouse...');

        try {
            for (const table of this.tables) {
                await this.syncTableToWarehouse(table);
            }
            console.log('✅ Warehouse sync completed');
        } catch (error) {
            console.error('❌ Warehouse sync failed:', error.message);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync a single table from local to warehouse
     */
    async syncTableToWarehouse(tableName: string): Promise<void> {
        if (!this.warehousePool) return;

        try {
            // Get all data from local primary
            const result = await this.primaryPool.query(`SELECT * FROM ${tableName}`);

            if (result.rows.length === 0) {
                return;
            }

            // Clear warehouse table and insert fresh data
            await this.warehousePool.query(`DELETE FROM ${tableName}`);

            // Build bulk insert
            const columns = Object.keys(result.rows[0]);
            const placeholders = result.rows.map((_, rowIndex) =>
                `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
            ).join(', ');

            const values = result.rows.flatMap(row => columns.map(col => row[col]));

            await this.warehousePool.query(
                `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`,
                values
            );

            console.log(`  ✓ ${tableName}: ${result.rows.length} rows → warehouse`);
        } catch (error) {
            console.error(`  ✗ ${tableName}: ${error.message}`);
        }
    }

    /**
     * Legacy method for backwards compatibility
     */
    async syncAll(): Promise<void> {
        return this.syncToWarehouse();
    }

    /**
     * Sync specific tables after a write operation
     */
    async syncAfterWrite(tables: string[]): Promise<void> {
        for (const table of tables) {
            await this.syncTableToWarehouse(table);
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
