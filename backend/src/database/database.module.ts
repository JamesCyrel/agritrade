import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';
import { SyncService } from './sync.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        // Primary Pool (Supabase) - All writes go here
        {
            provide: 'PRIMARY_POOL',
            useFactory: (configService: ConfigService) => {
                const connectionString = configService.get<string>('PRIMARY_DB_URL');
                if (!connectionString) {
                    throw new Error('PRIMARY_DB_URL is missing - Supabase connection required');
                }
                return new Pool({
                    connectionString,
                    ssl: { rejectUnauthorized: false }, // Required for Supabase
                });
            },
            inject: [ConfigService],
        },
        // Replica Pool (Local) - Read cache
        {
            provide: 'REPLICA_POOL',
            useFactory: (configService: ConfigService) => {
                const connectionString = configService.get<string>('REPLICA_DB_URL');
                if (!connectionString) {
                    console.warn('REPLICA_DB_URL not set - using PRIMARY_DB_URL for reads');
                    const primaryUrl = configService.get<string>('PRIMARY_DB_URL');
                    return new Pool({
                        connectionString: primaryUrl,
                        ssl: { rejectUnauthorized: false },
                    });
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
        // Legacy support - DATABASE_POOL points to PRIMARY for backwards compatibility
        {
            provide: 'DATABASE_POOL',
            useFactory: (primaryPool: Pool) => primaryPool,
            inject: ['PRIMARY_POOL'],
        },
        DatabaseService,
        SyncService,
    ],
    exports: ['PRIMARY_POOL', 'REPLICA_POOL', 'DATABASE_POOL', DatabaseService, SyncService],
})
export class DatabaseModule { }
