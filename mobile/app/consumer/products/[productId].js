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
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../../services/api";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.productId;
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [showAddToCart, setShowAddToCart] = useState(false);
  const [selectedSackSize, setSelectedSackSize] = useState(null); // null = buy by kg
  const [quantity, setQuantity] = useState("1");
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

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
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    const maxQuantity = selectedSackSize === null
      ? parseFloat(product.available_quantity)
      : Math.floor(parseFloat(product.available_quantity) / parseFloat(selectedSackSize));

    if (parseFloat(quantity) > maxQuantity) {
      Alert.alert("Error", `Maximum available: ${maxQuantity} ${selectedSackSize === null ? 'kg' : 'sacks'}`);
      return;
    }

    try {
      setAddingToCart(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.addToCart(token, {
        productId: product.product_id,
        quantity: parseFloat(quantity),
        sackSizeKg: selectedSackSize ? parseFloat(selectedSackSize) : null,
      });

      if (res.success) {
        Alert.alert("Success", "Item added to cart", [
          { text: "OK", onPress: () => {
            setShowAddToCart(false);
            setQuantity("1");
            setSelectedSackSize(null);
          }},
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to add item to cart");
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      Alert.alert("Error", "Failed to add item to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Images */}
      {product.images && product.images.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {product.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.productImage} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.productImage}>
          <Text style={styles.productImagePlaceholder}>🌾</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Product Info */}
        <Text style={styles.productName}>{product.variety_name}</Text>
        <Text style={styles.productType}>{product.rice_type}</Text>
        <Text style={styles.productPrice}>₱{product.price_per_kg} per kg</Text>

        {product.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionContent}>{product.description}</Text>
          </View>
        )}

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={styles.sectionContent}>
            {product.available_quantity} {product.quantity_unit} available
          </Text>
        </View>

        {/* Sack Sizes */}
        {product.sack_sizes && product.sack_sizes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Sack Sizes</Text>
            {product.sack_sizes.map((sack, index) => (
              <View key={index} style={styles.sackSizeItem}>
                <Text style={styles.sackSizeText}>
                  {sack.size_kg} kg - ₱{sack.price}
                </Text>
              </View>
            ))}
          </View>
        )}

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
                  <Text style={styles.ratingStars}>
                    {Array.from({ length: 5 }, (_, i) => 
                      i < Math.round(product.average_rating) ? "⭐" : "☆"
                    ).join("")}
                  </Text>
                  <Text style={styles.ratingText}>
                    {parseFloat(product.average_rating).toFixed(1)} ({product.total_reviews || 0} reviews)
                  </Text>
                </View>
              )}
            </View>
            {product.farmer_address && (
              <Text style={styles.farmerAddress}>📍 {product.farmer_address}</Text>
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

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => setShowAddToCart(true)}
        >
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>

      {/* Add to Cart Modal */}
      <Modal visible={showAddToCart} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Cart</Text>
              <TouchableOpacity onPress={() => setShowAddToCart(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Purchase Option */}
              <Text style={styles.modalLabel}>Purchase Option</Text>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  selectedSackSize === null && styles.optionButtonActive,
                ]}
                onPress={() => setSelectedSackSize(null)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    selectedSackSize === null && styles.optionButtonTextActive,
                  ]}
                >
                  By Kilogram - ₱{product.price_per_kg}/kg
                </Text>
              </TouchableOpacity>

              {/* Sack Size Options */}
              {product.sack_sizes && product.sack_sizes.length > 0 && (
                <>
                  {product.sack_sizes.map((sack, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedSackSize === sack.size_kg && styles.optionButtonActive,
                      ]}
                      onPress={() => setSelectedSackSize(sack.size_kg)}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          selectedSackSize === sack.size_kg && styles.optionButtonTextActive,
                        ]}
                      >
                        {sack.size_kg} kg Sack - ₱{sack.price} per sack
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Quantity Input */}
              <Text style={styles.modalLabel}>Quantity</Text>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Enter quantity"
                keyboardType="decimal-pad"
              />
              {selectedSackSize === null ? (
                <Text style={styles.quantityHint}>Enter quantity in kilograms</Text>
              ) : (
                <Text style={styles.quantityHint}>Enter number of sacks</Text>
              )}

              {/* Price Calculation */}
              <View style={styles.priceCalculation}>
                <Text style={styles.priceCalculationLabel}>Estimated Total:</Text>
                <Text style={styles.priceCalculationValue}>
                  ₱
                  {selectedSackSize === null
                    ? (parseFloat(quantity) || 0) * parseFloat(product.price_per_kg)
                    : product.sack_sizes?.find((s) => s.size_kg === selectedSackSize)?.price
                      ? (parseFloat(quantity) || 0) *
                        parseFloat(
                          product.sack_sizes.find((s) => s.size_kg === selectedSackSize).price
                        )
                      : 0}
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
                style={[styles.modalAddButton, addingToCart && styles.modalAddButtonDisabled]}
                onPress={handleAddToCart}
                disabled={addingToCart || !quantity || parseFloat(quantity) <= 0}
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
    height: width,
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
  addToCartText: { fontSize: 16, fontWeight: "600", color: "#fff" },
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
});

