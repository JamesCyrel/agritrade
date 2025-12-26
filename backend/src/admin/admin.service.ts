
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class AdminService {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async listUsers(role?: string, status?: string) {
        const params: any[] = [];
        const where: string[] = [];

        if (role) {
            params.push(role.toUpperCase());
            where.push(`u.role = $${params.length}`);
        }

        if (status) {
            params.push(status.toUpperCase());
            where.push(`p.verification_status = $${params.length}`);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const sql = `
      SELECT 
        u.user_id, u.email, u.phone, u.role, u.created_at,
        p.full_name, p.farm_name, p.verification_status
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.user_id
      ${whereSql}
      ORDER BY u.created_at DESC
    `;
        const result = await this.pool.query(sql, params);
        return result.rows;
    }

    async listPendingFarmers() {
        const result = await this.pool.query(`
      SELECT u.user_id, u.email, u.phone, p.full_name, p.farm_name, p.verification_status, p.updated_at
      FROM users u
      JOIN profiles p ON p.user_id = u.user_id
      WHERE u.role = 'FARMER' AND p.verification_status IN ('PENDING_REVIEW', 'PENDING_DOCUMENTS')
      ORDER BY p.updated_at DESC
    `);
        return result.rows;
    }
}
