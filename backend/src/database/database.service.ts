import { Injectable, Inject } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';

/**
 * DatabaseService provides read/write routing between Supabase (primary) and local PostgreSQL (replica).
 * 
 * - WRITES: Always go to Supabase (PRIMARY_POOL)
 * - READS: Use local PostgreSQL (REPLICA_POOL) for faster queries
 * 
 * The service automatically detects query type based on SQL keywords.
 */
@Injectable()
export class DatabaseService {
    constructor(
        @Inject('PRIMARY_POOL') private readonly primaryPool: Pool,
        @Inject('REPLICA_POOL') private readonly replicaPool: Pool,
    ) { }

    /**
     * Execute a query with automatic routing.
     * - SELECT queries go to replica (local)
     * - INSERT/UPDATE/DELETE go to primary (Supabase)
     */
    async query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const isWriteOperation = this.isWriteQuery(sql);

        if (isWriteOperation) {
            return this.primaryPool.query<T>(sql, params);
        }

        // Try replica first, fall back to primary if replica fails
        try {
            return await this.replicaPool.query<T>(sql, params);
        } catch (error) {
            console.warn('Replica query failed, falling back to primary:', error.message);
            return this.primaryPool.query<T>(sql, params);
        }
    }

    /**
     * Force query to primary (Supabase) - use for transactions or critical reads
     */
    async queryPrimary<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        return this.primaryPool.query<T>(sql, params);
    }

    /**
     * Force query to replica (local) - use for non-critical reads
     */
    async queryReplica<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        return this.replicaPool.query<T>(sql, params);
    }

    /**
     * Check if a query is a write operation
     */
    private isWriteQuery(sql: string): boolean {
        const normalized = sql.trim().toUpperCase();
        return (
            normalized.startsWith('INSERT') ||
            normalized.startsWith('UPDATE') ||
            normalized.startsWith('DELETE') ||
            normalized.startsWith('CREATE') ||
            normalized.startsWith('ALTER') ||
            normalized.startsWith('DROP') ||
            normalized.startsWith('TRUNCATE')
        );
    }

    /**
     * Get the primary pool directly (for transactions)
     */
    getPrimaryPool(): Pool {
        return this.primaryPool;
    }

    /**
     * Get the replica pool directly
     */
    getReplicaPool(): Pool {
        return this.replicaPool;
    }
}
