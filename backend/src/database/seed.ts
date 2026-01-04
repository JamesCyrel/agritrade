import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function seed() {
    const pool = new Pool({
        connectionString: process.env.SUPABASE_DB_URL,
    });

    console.log('🌱 Starting database seeding...\n');

    try {
        // Hash password for all test users
        const passwordHash = await bcrypt.hash('password123', 10);

        // Clear existing data (optional - comment out if you want to preserve data)
        console.log('🗑️  Clearing existing data...');
        await pool.query('DELETE FROM products');
        await pool.query('DELETE FROM profiles');
        await pool.query('DELETE FROM users');

        // Seed Admin User
        console.log('👤 Creating admin user...');
        const adminResult = await pool.query(
            `INSERT INTO users (email, phone, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING user_id`,
            ['admin@agritrade.com', '+639000000001', passwordHash, 'ADMIN']
        );
        const adminId = adminResult.rows[0].user_id;

        await pool.query(
            `INSERT INTO profiles (user_id, full_name, address) 
       VALUES ($1, $2, $3)`,
            [adminId, 'System Administrator', 'AgriTrade HQ, Manila, Philippines']
        );

        // Seed Farmer Users
        console.log('🧑‍🌾 Creating farmer users...');
        const farmers = [
            { email: 'juan.farmer@example.com', phone: '+639111111111', name: 'Juan Dela Cruz', farm: 'Dela Cruz Rice Farm', address: 'Brgy. San Jose, Nueva Ecija, Philippines' },
            { email: 'maria.farmer@example.com', phone: '+639222222222', name: 'Maria Santos', farm: 'Santos Family Farm', address: 'Brgy. Sta. Rosa, Isabela, Philippines' },
            { email: 'pedro.farmer@example.com', phone: '+639333333333', name: 'Pedro Reyes', farm: 'Reyes Organic Rice', address: 'Brgy. Mabini, Pangasinan, Philippines' },
        ];

        const farmerIds: number[] = [];
        for (const farmer of farmers) {
            const result = await pool.query(
                `INSERT INTO users (email, phone, password_hash, role) 
         VALUES ($1, $2, $3, 'FARMER') 
         RETURNING user_id`,
                [farmer.email, farmer.phone, passwordHash]
            );
            const farmerId = result.rows[0].user_id;
            farmerIds.push(farmerId);

            await pool.query(
                `INSERT INTO profiles (user_id, full_name, farm_name, address, verification_status) 
         VALUES ($1, $2, $3, $4, 'APPROVED')`,
                [farmerId, farmer.name, farmer.farm, farmer.address]
            );
        }

        // Seed Consumer Users
        console.log('🛒 Creating consumer users...');
        const consumers = [
            { email: 'consumer1@example.com', phone: '+639444444444', name: 'Ana Garcia', address: 'Makati City, Metro Manila' },
            { email: 'consumer2@example.com', phone: '+639555555555', name: 'Carlos Rivera', address: 'Quezon City, Metro Manila' },
        ];

        for (const consumer of consumers) {
            const result = await pool.query(
                `INSERT INTO users (email, phone, password_hash, role) 
         VALUES ($1, $2, $3, 'CONSUMER') 
         RETURNING user_id`,
                [consumer.email, consumer.phone, passwordHash]
            );
            const consumerId = result.rows[0].user_id;

            await pool.query(
                `INSERT INTO profiles (user_id, full_name, address) 
         VALUES ($1, $2, $3)`,
                [consumerId, consumer.name, consumer.address]
            );

            // Add a default address for the consumer
            await pool.query(
                `INSERT INTO consumer_addresses (user_id, label, full_address, city, is_default) 
         VALUES ($1, $2, $3, $4, true)`,
                [consumerId, 'Home', consumer.address, consumer.address.split(',')[0]]
            );
        }

        // Seed Products
        console.log('🌾 Creating sample products...');
        const products = [
            { farmerId: farmerIds[0], riceType: 'MILLED', variety: 'Sinandomeng', description: 'Premium quality Sinandomeng rice, locally grown and freshly milled.', price: 55.00, quantity: 500, images: ['/assets/rice/rice1.jpg', '/assets/rice/rice2.jpg'] },
            { farmerId: farmerIds[0], riceType: 'MILLED', variety: 'Jasmine Rice', description: 'Fragrant jasmine rice perfect for everyday meals.', price: 65.00, quantity: 300, images: ['/assets/rice/rice3.jpg', '/assets/rice/rice4.jpg'] },
            { farmerId: farmerIds[1], riceType: 'MILLED', variety: 'Dinorado', description: 'High-quality Dinorado rice with excellent aroma and taste.', price: 75.00, quantity: 400, images: ['/assets/rice/rice5.webp', '/assets/rice/unmilledrice1.avif'] },
            { farmerId: farmerIds[1], riceType: 'UNMILLED_PADDY', variety: 'Fresh Palay', description: 'Unmilled paddy rice, ideal for bulk buyers and millers.', price: 28.00, quantity: 1000, images: ['/assets/rice/unmilledrice2.jpg', '/assets/rice/unmilledrice3.webp'] },
            { farmerId: farmerIds[2], riceType: 'MILLED', variety: 'Organic Brown Rice', description: 'Certified organic brown rice, healthy and nutritious.', price: 85.00, quantity: 200, images: ['/assets/rice/unmilledrice4.webp', '/assets/rice/rice1.jpg'] },
            { farmerId: farmerIds[2], riceType: 'MILLED', variety: 'Red Rice', description: 'Nutritious red rice variety with natural antioxidants.', price: 90.00, quantity: 150, images: ['/assets/rice/rice2.jpg', '/assets/rice/rice3.jpg'] },
        ];

        for (const product of products) {
            const result = await pool.query(
                `INSERT INTO products (farmer_id, rice_type, variety_name, description, price_per_kg, available_quantity, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE') 
         RETURNING product_id`,
                [product.farmerId, product.riceType, product.variety, product.description, product.price, product.quantity]
            );
            const productId = result.rows[0].product_id;

            // Add product images
            for (let i = 0; i < product.images.length; i++) {
                await pool.query(
                    `INSERT INTO product_images (product_id, image_url, image_order) 
             VALUES ($1, $2, $3)`,
                    [productId, product.images[i], i]
                );
            }

            // Add sack sizes for each product
            await pool.query(
                `INSERT INTO product_sack_sizes (product_id, size_kg, price) VALUES 
         ($1, 5, $2),
         ($1, 10, $3),
         ($1, 25, $4),
         ($1, 50, $5)`,
                [productId, product.price * 5, product.price * 10, product.price * 25 * 0.95, product.price * 50 * 0.90]
            );
        }

        console.log('\n✅ Database seeding completed successfully!\n');
        console.log('📋 Summary:');
        console.log('   - 1 Admin user');
        console.log('   - 3 Farmer users (with profiles)');
        console.log('   - 2 Consumer users (with addresses)');
        console.log('   - 6 Products (with images and sack sizes)');
        console.log('\n🔑 All test users have password: password123');
        console.log('\n📧 Test accounts:');
        console.log('   Admin:    admin@agritrade.com');
        console.log('   Farmer:   juan.farmer@example.com');
        console.log('   Consumer: consumer1@example.com');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

seed();
