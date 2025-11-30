const pool = require('../config/database');

// Local rice images served from backend /assets/rice/
// These will be prefixed with the server URL when retrieved
const RICE_IMAGES = [
  '/assets/rice/rice1.jpg',
  '/assets/rice/rice2.jpg',
  '/assets/rice/rice3.jpg',
  '/assets/rice/rice4.jpg',
  '/assets/rice/rice5.webp',
  '/assets/rice/unmilledrice1.jpg',
  '/assets/rice/unmilledrice2.jpg',
  '/assets/rice/unmilledrice3.webp',
  '/assets/rice/unmilledrice4.webp',
];

async function updateImages() {
  try {
    console.log('Updating ALL product images to local rice images...\n');
    
    // Update ALL images to use local rice images
    const allImages = await pool.query('SELECT image_id, image_url FROM product_images ORDER BY image_id');
    console.log(`📸 Updating ${allImages.rows.length} product images...\n`);
    
    for (let i = 0; i < allImages.rows.length; i++) {
      const riceImage = RICE_IMAGES[i % RICE_IMAGES.length];
      await pool.query(
        'UPDATE product_images SET image_url = $1 WHERE image_id = $2',
        [riceImage, allImages.rows[i].image_id]
      );
    }
    
    console.log(`✅ Updated all ${allImages.rows.length} images to local rice photos!`);
    
    // Show sample of updated images
    const sample = await pool.query('SELECT image_url FROM product_images LIMIT 5');
    console.log('\n📸 Sample URLs (will be prefixed with server URL):');
    sample.rows.forEach((row, i) => console.log(`   ${i+1}. ${row.image_url}`));
    
    console.log('\n✅ All product images now use local rice folder!');
    console.log('   Images are served from: http://YOUR_SERVER:3000/assets/rice/');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateImages();
