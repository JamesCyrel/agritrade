const Product = require('../models/Product');

// Check if farmer is verified before allowing product operations
const checkFarmerVerification = async (farmerId) => {
  const isVerified = await Product.isFarmerVerified(farmerId);
  if (!isVerified) {
    throw new Error('Only verified farmers can manage products');
  }
};

// Create product (PM-1)
exports.createProduct = async (req, res) => {
  try {
    await checkFarmerVerification(req.user.userId);

    const { rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, images, sack_sizes } = req.body;

    // Validation
    if (!rice_type || !['MILLED', 'UNMILLED_PADDY'].includes(rice_type)) {
      return res.status(400).json({ success: false, message: 'Valid rice type is required (MILLED or UNMILLED_PADDY)' });
    }
    if (!variety_name || !variety_name.trim()) {
      return res.status(400).json({ success: false, message: 'Variety name is required' });
    }
    if (!price_per_kg || price_per_kg <= 0) {
      return res.status(400).json({ success: false, message: 'Valid price per kg is required' });
    }
    if (available_quantity === undefined || available_quantity < 0) {
      return res.status(400).json({ success: false, message: 'Valid available quantity is required' });
    }
    if (images && (images.length < 1 || images.length > 5)) {
      return res.status(400).json({ success: false, message: '1-5 images are required' });
    }

    const product = await Product.create(req.user.userId, {
      rice_type,
      variety_name: variety_name.trim(),
      description: description || null,
      price_per_kg: parseFloat(price_per_kg),
      available_quantity: parseFloat(available_quantity),
      quantity_unit: quantity_unit || 'KG',
      images: images || [],
      sack_sizes: sack_sizes || [],
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create product' });
  }
};

// Get all products for farmer (PM-3)
exports.getProducts = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const products = await Product.findByFarmerId(req.user.userId, includeInactive);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (product.farmer_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('getProduct error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

// Update product (PM-2)
exports.updateProduct = async (req, res) => {
  try {
    await checkFarmerVerification(req.user.userId);

    const { productId } = req.params;
    const { rice_type, variety_name, description, price_per_kg, available_quantity, quantity_unit, status, images, sack_sizes } = req.body;

    // Check if product exists and belongs to farmer
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (existingProduct.farmer_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Validate rice_type if provided
    if (rice_type && !['MILLED', 'UNMILLED_PADDY'].includes(rice_type)) {
      return res.status(400).json({ success: false, message: 'Invalid rice type' });
    }

    // Validate status if provided
    if (status && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Validate images if provided
    if (images !== undefined && (images.length < 1 || images.length > 5)) {
      return res.status(400).json({ success: false, message: '1-5 images are required' });
    }

    const updateData = {};
    if (rice_type !== undefined) updateData.rice_type = rice_type;
    if (variety_name !== undefined) updateData.variety_name = variety_name.trim();
    if (description !== undefined) updateData.description = description;
    if (price_per_kg !== undefined) updateData.price_per_kg = parseFloat(price_per_kg);
    if (available_quantity !== undefined) updateData.available_quantity = parseFloat(available_quantity);
    if (quantity_unit !== undefined) updateData.quantity_unit = quantity_unit;
    if (status !== undefined) updateData.status = status;
    if (images !== undefined) updateData.images = images;
    if (sack_sizes !== undefined) updateData.sack_sizes = sack_sizes;

    const product = await Product.update(productId, req.user.userId, updateData);
    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update product' });
  }
};

// Archive product (PM-2)
exports.archiveProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.archive(productId, req.user.userId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product archived successfully' });
  } catch (error) {
    console.error('archiveProduct error:', error);
    res.status(500).json({ success: false, message: 'Failed to archive product' });
  }
};

// Unarchive product
exports.unarchiveProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.unarchive(productId, req.user.userId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not archived' });
    }
    res.json({ success: true, message: 'Product unarchived successfully' });
  } catch (error) {
    console.error('unarchiveProduct error:', error);
    res.status(500).json({ success: false, message: 'Failed to unarchive product' });
  }
};

// Get archived products
exports.getArchivedProducts = async (req, res) => {
  try {
    const products = await Product.findArchivedByFarmerId(req.user.userId);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('getArchivedProducts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch archived products' });
  }
};

// Update inventory manually (PM-4)
exports.updateInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { available_quantity } = req.body;

    if (available_quantity === undefined || available_quantity < 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }

    // Check if product exists and belongs to farmer
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (existingProduct.farmer_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await Product.updateInventory(productId, req.user.userId, parseFloat(available_quantity));
    res.json({ success: true, message: 'Inventory updated successfully', data: result });
  } catch (error) {
    console.error('updateInventory error:', error);
    res.status(500).json({ success: false, message: 'Failed to update inventory' });
  }
};

