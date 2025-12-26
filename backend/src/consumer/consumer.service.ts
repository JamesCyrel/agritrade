
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class ConsumerService implements OnModuleInit {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async onModuleInit() {
        await this.createTables();
    }

    async createTables() {
        const query = `
        CREATE TABLE IF NOT EXISTS consumer_addresses (
          address_id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
          label VARCHAR(50) NOT NULL,
          full_address TEXT NOT NULL,
          city VARCHAR(100),
          state VARCHAR(100),
          postal_code VARCHAR(20),
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payment_methods (
          payment_id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
          payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('CARD', 'WALLET', 'UPI')),
          card_number_last4 VARCHAR(4),
          card_holder_name VARCHAR(100),
          expiry_month INTEGER,
          expiry_year INTEGER,
          upi_id VARCHAR(100),
          wallet_provider VARCHAR(50),
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON consumer_addresses(user_id);
        CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
      `;
        try {
            await this.pool.query(query);
        } catch (error) {
            console.error('Error creating consumer tables', error);
        }
    }

    async getProfile(userId: number) {
        const res = await this.pool.query(
            `SELECT u.user_id, u.email, u.phone, p.full_name, p.address
           FROM users u
           LEFT JOIN profiles p ON u.user_id = p.user_id
           WHERE u.user_id = $1`,
            [userId]
        );
        return res.rows[0];
    }

    async updateProfile(userId: number, fullName: string) {
        const res = await this.pool.query(
            `INSERT INTO profiles (user_id, full_name)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
           RETURNING user_id, full_name`,
            [userId, fullName]
        );
        return res.rows[0];
    }

    // Address methods
    async getAddresses(userId: number) {
        const res = await this.pool.query(
            `SELECT * FROM consumer_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
            [userId]
        );
        return res.rows;
    }

    async addAddress(userId: number, data: any) {
        const { label, full_address, city, state, postal_code, is_default } = data;
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            if (is_default) {
                await client.query(`UPDATE consumer_addresses SET is_default = FALSE WHERE user_id = $1`, [userId]);
            }
            const res = await client.query(
                `INSERT INTO consumer_addresses (user_id, label, full_address, city, state, postal_code, is_default)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [userId, label, full_address, city, state, postal_code, is_default || false]
            );
            await client.query('COMMIT');
            return res.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
