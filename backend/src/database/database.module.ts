
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'DATABASE_POOL',
            useFactory: (configService: ConfigService) => {
                const connectionString = configService.get<string>('SUPABASE_DB_URL');
                if (!connectionString) {
                    // Fallback or error
                    throw new Error('SUPABASE_DB_URL is missing');
                }
                return new Pool({
                    connectionString,
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: ['DATABASE_POOL'],
})
export class DatabaseModule { }
