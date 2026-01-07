import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';
import { SyncService } from './sync.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        // Primary Pool (Local PostgreSQL) - All reads/writes go here
        {
            provide: 'PRIMARY_POOL',
            useFactory: (configService: ConfigService) => {
                const connectionString = configService.get<string>('PRIMARY_DB_URL');
                if (!connectionString) {
                    throw new Error('PRIMARY_DB_URL is missing - Local PostgreSQL connection required');
                }
                // Local DB typically doesn't need SSL
                const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
                return new Pool({
                    connectionString,
                    ssl: isLocal ? false : { rejectUnauthorized: false },
                });
            },
            inject: [ConfigService],
        },
        // Warehouse Pool (Supabase) - Sync target for data warehouse
        {
            provide: 'WAREHOUSE_POOL',
            useFactory: (configService: ConfigService) => {
                const connectionString = configService.get<string>('WAREHOUSE_DB_URL');
                if (!connectionString) {
                    console.warn('WAREHOUSE_DB_URL not set - data warehouse sync disabled');
                    return null;
                }
                return new Pool({
                    connectionString,
                    ssl: { rejectUnauthorized: false }, // Required for Supabase
                });
            },
            inject: [ConfigService],
        },
        // Legacy support - DATABASE_POOL points to PRIMARY for backwards compatibility
        {
            provide: 'DATABASE_POOL',
            useFactory: (primaryPool: Pool) => primaryPool,
            inject: ['PRIMARY_POOL'],
        },
        // Legacy support - REPLICA_POOL points to PRIMARY (no read replica in this mode)
        {
            provide: 'REPLICA_POOL',
            useFactory: (primaryPool: Pool) => primaryPool,
            inject: ['PRIMARY_POOL'],
        },
        DatabaseService,
        SyncService,
    ],
    exports: ['PRIMARY_POOL', 'WAREHOUSE_POOL', 'REPLICA_POOL', 'DATABASE_POOL', DatabaseService, SyncService],
})
export class DatabaseModule { }
