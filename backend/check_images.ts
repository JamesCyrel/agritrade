import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

async function checkImages() {
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT product_id, image_url FROM product_images LIMIT 20');
        console.log('Sample Image Paths in DB:');
        res.rows.forEach(row => {
            console.log(`Product ${row.product_id}: ${row.image_url}`);
        });
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

checkImages();
