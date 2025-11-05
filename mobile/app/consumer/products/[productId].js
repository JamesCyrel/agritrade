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
            <Text style={styles.farmerName}>{product.farm_name || product.farmer_name}</Text>
            {product.farmer_address && (
              <Text style={styles.farmerAddress}>📍 {product.farmer_address}</Text>
            )}
            {product.average_rating > 0 && (
              <Text style={styles.farmerRating}>
                ⭐ {product.average_rating.toFixed(1)} ({product.total_reviews} reviews)
              </Text>
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

        {/* Add to Cart Button (Placeholder for future order management) */}
        <TouchableOpacity style={styles.addToCartButton} disabled>
          <Text style={styles.addToCartText}>Add to Cart (Coming Soon)</Text>
        </TouchableOpacity>
      </View>
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
  farmerName: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 8 },
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
    opacity: 0.5,
  },
  addToCartText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});

