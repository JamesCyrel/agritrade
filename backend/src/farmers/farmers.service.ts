
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class FarmersService implements OnModuleInit {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async onModuleInit() {
        await this.createVerificationTables();
    }

    async createVerificationTables() {
        const query = `
      DO $$ BEGIN
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7); EXCEPTION WHEN undefined_table THEN NULL; END;
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7); EXCEPTION WHEN undefined_table THEN NULL; END;
        BEGIN ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_reason TEXT; EXCEPTION WHEN undefined_table THEN NULL; END;
      END $$;

      CREATE TABLE IF NOT EXISTS verification_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        doc_type VARCHAR(50) NOT NULL,
        file_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ver_docs_user ON verification_documents(user_id);
    `;
        await this.pool.query(query);
    }

    async getProfile(userId: number) {
        const res = await this.pool.query(
            `SELECT profile_id, user_id, full_name, farm_name, address, bank_account_number, bank_name, branch_code, verification_status, latitude, longitude
       FROM profiles WHERE user_id=$1`,
            [userId]
        );
        return res.rows[0] || null;
    }

    async updateProfile(userId: number, data: any) {
        const {
            full_name,
            farm_name,
            address,
            bank_account_number,
            bank_name,
            branch_code,
            latitude,
            longitude,
        } = data;

        const query = `
      INSERT INTO profiles (
        user_id, full_name, farm_name, address, bank_account_number,
        bank_name, branch_code, verification_status, latitude, longitude
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        COALESCE((SELECT verification_status FROM profiles WHERE user_id=$1),'PENDING_DOCUMENTS'),
        $8,$9
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        farm_name = EXCLUDED.farm_name,
        address = EXCLUDED.address,
        bank_account_number = EXCLUDED.bank_account_number,
        bank_name = EXCLUDED.bank_name,
        branch_code = EXCLUDED.branch_code,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = NOW()
      RETURNING profile_id, user_id, full_name, farm_name, address, bank_account_number, bank_name, branch_code, verification_status, latitude, longitude;
    `;
        const params = [userId, full_name || null, farm_name || null, address || null, bank_account_number || null, bank_name || null, branch_code || null, latitude || null, longitude || null];
        const res = await this.pool.query(query, params);

        // Keep status at PENDING_DOCUMENTS or update if needed logic from controller is moved here partly
        // But original controller calls setVerificationStatus explicitly.
        // We will follow the controller logic in the controller or a higher level method.

        return res.rows[0];
    }

    async setVerificationStatus(userId: number, status: string, reason: string | null = null) {
        const res = await this.pool.query(
            `UPDATE profiles SET verification_status=$2, updated_at=NOW(), verification_reason=$3 WHERE user_id=$1 RETURNING verification_status`,
            [userId, status, reason]
        );
        return res.rows[0];
    }

    async addDocument(userId: number, docType: string, fileData: string) {
        const res = await this.pool.query(
            `INSERT INTO verification_documents(user_id, doc_type, file_data) VALUES($1,$2,$3) RETURNING id, doc_type, created_at`,
            [userId, docType, fileData || null]
        );
        return res.rows[0];
    }

    async listDocuments(userId: number) {
        const res = await this.pool.query(
            `SELECT id, doc_type, created_at FROM verification_documents WHERE user_id=$1 ORDER BY created_at DESC`,
            [userId]
        );
        return res.rows;
    }
}
