import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI, getImageUrl } from "../../../services/api";
import { Heart, Wheat, Star, MapPin, X } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.productId;
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [showAddToCart, setShowAddToCart] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [addingToCart, setAddingToCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0); // Track quantity already in cart

  useEffect(() => {
    loadProduct();
    loadCartQuantity();
  }, [productId]);

  // Load current cart quantity for this product
  const loadCartQuantity = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.getCart(token);
      if (res.success && res.data && res.data.items) {
        const cartItem = res.data.items.find(item => item.product_id == productId);
        setCartQuantity(cartItem ? parseFloat(cartItem.quantity) : 0);
      }
    } catch (error) {
      console.error("Load cart quantity error:", error);
    }
  };

  useEffect(() => {
    if (productId) {
      checkFavoriteStatus();
    }
  }, [productId]);

  // Refresh favorite status, cart quantity, and product data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (productId) {
        checkFavoriteStatus();
        loadCartQuantity();
        loadProduct(); // Refresh product data to get updated available_quantity
      }
    }, [productId])
  );

  const checkFavoriteStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.checkFavorite(token, productId);
      if (res.success && res.data) {
        setIsFavorite(res.data.isFavorite);
      }
    } catch (error) {
      console.error("Check favorite error:", error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      setTogglingFavorite(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.toggleFavorite(token, productId);
      if (res.success && res.data) {
        setIsFavorite(res.data.isFavorite);
      } else {
        Alert.alert("Error", res.message || "Failed to update favorite");
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
      Alert.alert("Error", "Failed to update favorite");
    } finally {
      setTogglingFavorite(false);
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.getProductDetails(token, productId);
      if (res.success) {
        setProduct(res.data);
      } else {
        Alert.alert("Error", res.message || "Failed to load product");
        router.back();
      }
    } catch (error) {
      console.error("Load product error:", error);
      Alert.alert("Error", "Failed to load product");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  if (!product) {
    return null;
  }

  const handleAddToCart = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert(
        "Invalid Quantity",
        "Please enter a valid quantity greater than 0.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    const availableQty = parseFloat(product.available_quantity) || 0;
    const requestedQty = parseFloat(quantity);
    const totalQtyAfterAdd = cartQuantity + requestedQty;
    const remainingAvailable = availableQty - cartQuantity;

    // Check if total quantity (cart + new) exceeds available stock
    if (totalQtyAfterAdd > availableQty) {
      if (remainingAvailable <= 0) {
        Alert.alert(
          "Maximum Quantity Reached",
          `You already have ${cartQuantity} kg of ${product.variety_name || 'this product'} in your cart, which is the maximum available.`,
          [{ text: "OK", style: "default" }]
        );
      } else {
        Alert.alert(
          "Quantity Limit Exceeded",
          `Sorry, only ${availableQty} kg of ${product.variety_name || 'this product'} is available.\n\nYou already have ${cartQuantity} kg in your cart. You can only add ${remainingAvailable} kg more.`,
          [{ text: "OK", style: "default" }]
        );
      }
      return;
    }

    try {
      setAddingToCart(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.addToCart(token, {
        product_id: product.product_id,
        quantity: requestedQty,
      });

      if (res.success) {
        // Update local cart quantity
        setCartQuantity(prev => prev + requestedQty);
        Alert.alert("Success", `Added ${requestedQty} kg to cart. Total in cart: ${totalQtyAfterAdd} kg`, [
          {
            text: "OK", onPress: () => {
              setShowAddToCart(false);
              setQuantity("1");
            }
          },
        ]);
      } else {
        // Handle backend error (e.g., stock changed since page load)
        if (res.message && (res.message.toLowerCase().includes('available') || res.message.toLowerCase().includes('stock'))) {
          Alert.alert(
            "Quantity Limit Exceeded",
            res.message,
            [{ text: "OK", style: "default" }]
          );
          // Refresh product and cart data
          loadProduct();
          loadCartQuantity();
        } else {
          Alert.alert("Error", res.message || "Failed to add item to cart");
        }
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      // Extract error message from various possible formats
      const errorMsg = error?.body?.message || error?.message || "Failed to add item to cart";
      
      // Check if it's a stock-related error
      if (errorMsg.toLowerCase().includes('available') || errorMsg.toLowerCase().includes('stock') || errorMsg.toLowerCase().includes('maximum')) {
        Alert.alert(
          "Quantity Limit Exceeded",
          errorMsg,
          [{ text: "OK", style: "default" }]
        );
        // Refresh product and cart data since stock may have changed
        loadProduct();
        loadCartQuantity();
      } else {
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Images */}
      {product.images && product.images.length > 0 ? (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {product.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: getImageUrl(image) }}
                style={styles.productImage}
                resizeMode="cover"
                onError={(e) => console.log(`Failed to load image: ${getImageUrl(image)}`, e.nativeEvent.error)}
              />
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
            disabled={togglingFavorite}
          >
            <Heart
              size={24}
              color={isFavorite ? "#e74c3c" : "#666"}
              fill={isFavorite ? "#e74c3c" : "transparent"}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.productImage}>
          <Wheat size={60} color="#ccc" />
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
            disabled={togglingFavorite}
          >
            <Heart
              size={24}
              color={isFavorite ? "#e74c3c" : "#666"}
              fill={isFavorite ? "#e74c3c" : "transparent"}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {/* Product Info */}
        <View style={styles.productHeader}>
          <View style={styles.productHeaderLeft}>
            <Text style={styles.productName}>{product.variety_name}</Text>
            <Text style={styles.productType}>{product.rice_type}</Text>
            <Text style={styles.productPrice}>₱{product.price_per_kg} per kg</Text>
            {/* Out of Stock Badge */}
            {product.is_out_of_stock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>
        </View>

        {product.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionContent}>{product.description}</Text>
          </View>
        )}

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={[styles.sectionContent, product.is_out_of_stock && { color: '#f44336' }]}>
            {product.is_out_of_stock ? 'Out of Stock' : `${product.available_quantity} kg available`}
          </Text>
        </View>

        {/* Farmer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farmer Information</Text>
          <TouchableOpacity
            style={styles.farmerCard}
            onPress={() => {
              if (product.farmer_id) {
                router.push(`/consumer/farmers/${product.farmer_id}/storefront`);
              }
            }}
          >
            <View style={styles.farmerHeader}>
              <Text style={styles.farmerName}>{product.farm_name || product.farmer_name}</Text>
              {product.average_rating > 0 && (
                <View style={styles.ratingContainer}>
                  <View style={{ flexDirection: 'row' }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={16}
                        color={i < Math.round(product.average_rating) ? "#f1c40f" : "#ccc"}
                        fill={i < Math.round(product.average_rating) ? "#f1c40f" : "transparent"}
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingText}>
                    {parseFloat(product.average_rating).toFixed(1)} ({product.total_reviews || 0} reviews)
                  </Text>
                </View>
              )}
            </View>
            {product.farmer_address && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MapPin size={14} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.farmerAddress}>{product.farmer_address}</Text>
              </View>
            )}
            <Text style={styles.viewStorefront}>View Storefront →</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews Section (Placeholder - will be implemented in RR-2) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <Text style={styles.sectionContent}>
            Reviews will be displayed here once the review system is implemented.
          </Text>
        </View>

        {/* Add to Cart Button - Disabled if out of stock or max quantity reached */}
        {(() => {
          const availableQty = parseFloat(product.available_quantity) || 0;
          const isOutOfStock = product.is_out_of_stock || availableQty <= 0;
          const isMaxInCart = cartQuantity >= availableQty && availableQty > 0;
          const isDisabled = isOutOfStock || isMaxInCart;
          
          let buttonText = 'Add to Cart';
          if (isOutOfStock) {
            buttonText = 'Out of Stock';
          } else if (isMaxInCart) {
            buttonText = 'Maximum in Cart';
          }
          
          return (
            <TouchableOpacity
              style={[styles.addToCartButton, isDisabled && styles.addToCartButtonDisabled]}
              onPress={() => {
                if (isMaxInCart) {
                  Alert.alert(
                    "Maximum Quantity Reached",
                    `You already have ${cartQuantity} kg of ${product.variety_name || 'this product'} in your cart, which is the maximum available.`,
                    [{ text: "OK", style: "default" }]
                  );
                } else if (!isDisabled) {
                  setShowAddToCart(true);
                }
              }}
            >
              <Text style={styles.addToCartText}>{buttonText}</Text>
            </TouchableOpacity>
          );
        })()}
      </View>

      {/* Add to Cart Modal */}
      <Modal visible={showAddToCart} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Cart</Text>
              <TouchableOpacity onPress={() => setShowAddToCart(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Product Info */}
              <View style={styles.optionButton}>
                <Text style={styles.optionButtonTextActive}>
                  {product.variety_name} - ₱{product.price_per_kg}/kg
                </Text>
                <Text style={styles.quantityHint}>
                  Total Available: {product.available_quantity} kg
                </Text>
                {cartQuantity > 0 && (
                  <Text style={[styles.quantityHint, { color: '#2d5016', fontWeight: '600' }]}>
                    Already in Cart: {cartQuantity} kg
                  </Text>
                )}
              </View>

              {/* Quantity Input */}
              <Text style={styles.modalLabel}>Quantity (kg)</Text>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={(text) => {
                  // Only allow numbers and one decimal point, no negative values
                  const sanitized = text.replace(/[^0-9.]/g, '');
                  // Ensure only one decimal point
                  const parts = sanitized.split('.');
                  const cleaned = parts.length > 2 
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : sanitized;
                  setQuantity(cleaned);
                }}
                placeholder="Enter quantity in kg"
                keyboardType="decimal-pad"
              />
              <Text style={styles.quantityHint}>
                {cartQuantity > 0 
                  ? `You can add up to ${Math.max(0, parseFloat(product.available_quantity) - cartQuantity)} kg more`
                  : `Maximum: ${product.available_quantity} kg`
                }
              </Text>

              {/* Price Calculation */}
              <View style={styles.priceCalculation}>
                <Text style={styles.priceCalculationLabel}>Estimated Total:</Text>
                <Text style={styles.priceCalculationValue}>
                  ₱{((parseFloat(quantity) || 0) * parseFloat(product.price_per_kg)).toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddToCart(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalAddButton, 
                  (addingToCart || (cartQuantity + parseFloat(quantity || 0)) > parseFloat(product.available_quantity)) && styles.modalAddButtonDisabled
                ]}
                onPress={handleAddToCart}
                disabled={addingToCart || !quantity || parseFloat(quantity) <= 0 || (cartQuantity + parseFloat(quantity)) > parseFloat(product.available_quantity)}
              >
                {addingToCart ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalAddButtonText}>Add to Cart</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { alignItems: "center", justifyContent: "center" },
  productImage: {
    width: width,
    height: width * 0.75,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  productImagePlaceholder: { fontSize: 80 },
  content: { padding: 16 },
  productName: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 4 },
  productType: { fontSize: 14, color: "#666", marginBottom: 8 },
  productPrice: { fontSize: 28, fontWeight: "bold", color: "#2d5016", marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 12 },
  sectionContent: { fontSize: 14, color: "#666", lineHeight: 20 },
  sackSizeItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sackSizeText: { fontSize: 14, color: "#333" },
  farmerCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  farmerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  farmerName: { fontSize: 18, fontWeight: "600", color: "#333", flex: 1 },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  ratingStars: {
    fontSize: 14,
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
  },
  farmerAddress: { fontSize: 14, color: "#666", marginBottom: 8 },
  farmerRating: { fontSize: 14, color: "#666", marginBottom: 8 },
  viewStorefront: { fontSize: 14, color: "#2d5016", fontWeight: "600" },
  addToCartButton: {
    backgroundColor: "#2d5016",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  addToCartButtonDisabled: {
    backgroundColor: "#ccc",
  },
  addToCartText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  outOfStockBadge: {
    backgroundColor: "#f44336",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  outOfStockText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  modalClose: { fontSize: 24, color: "#666" },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12, marginTop: 8 },
  optionButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  optionButtonActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#2d5016",
  },
  optionButtonText: { fontSize: 14, color: "#666" },
  optionButtonTextActive: { color: "#2d5016", fontWeight: "600" },
  quantityInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  quantityHint: { fontSize: 12, color: "#666", marginBottom: 16 },
  priceCalculation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginTop: 8,
  },
  priceCalculationLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
  priceCalculationValue: { fontSize: 20, fontWeight: "bold", color: "#2d5016" },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  modalCancelButtonText: { fontSize: 16, fontWeight: "600", color: "#666" },
  modalAddButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#2d5016",
    alignItems: "center",
  },
  modalAddButtonDisabled: { opacity: 0.5 },
  modalAddButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  productHeaderLeft: {
    flex: 1,
  },
  favoriteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  favoriteIcon: {
    fontSize: 24,
  },
});

