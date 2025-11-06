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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../../../services/api";

export default function FarmerStorefrontScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const farmerId = params.farmerId;
  const [loading, setLoading] = useState(true);
  const [storefront, setStorefront] = useState(null);
  const [favoriteStatus, setFavoriteStatus] = useState({});

  useEffect(() => {
    loadStorefront();
  }, [farmerId]);

  const loadStorefront = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.getFarmerStorefront(token, farmerId);
      if (res.success) {
        setStorefront(res.data);
      } else {
        Alert.alert("Error", res.message || "Failed to load storefront");
        router.back();
      }
    } catch (error) {
      console.error("Load storefront error:", error);
      Alert.alert("Error", "Failed to load storefront");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId, e) => {
    e.stopPropagation();
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.toggleFavorite(token, productId);
      if (res.success) {
        setFavoriteStatus((prev) => ({ ...prev, [productId]: res.isFavorite }));
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
    }
  };

  const checkFavoriteStatus = async (productId) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.checkFavorite(token, productId);
      if (res.success) {
        setFavoriteStatus((prev) => ({ ...prev, [productId]: res.isFavorite }));
      }
    } catch (error) {
      console.error("Check favorite error:", error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  if (!storefront) {
    return null;
  }

  const { farmer, products } = storefront;

  return (
    <ScrollView style={styles.container}>
      {/* Farmer Header */}
      <View style={styles.farmerHeader}>
        <View style={styles.farmerImage}>
          <Text style={styles.farmerImagePlaceholder}>🚜</Text>
        </View>
        <Text style={styles.farmerName}>{farmer.farm_name || farmer.full_name}</Text>
        {farmer.address && (
          <Text style={styles.farmerAddress}>📍 {farmer.address}</Text>
        )}
        {farmer.average_rating > 0 && (
          <Text style={styles.farmerRating}>
            ⭐ {farmer.average_rating.toFixed(1)} ({farmer.total_reviews} reviews)
          </Text>
        )}
      </View>

      {/* Products Section */}
      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>
          Products ({products.length})
        </Text>
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No products available</Text>
          </View>
        ) : (
          products.map((product) => {
            // Check favorite status when product is first rendered
            if (favoriteStatus[product.product_id] === undefined) {
              checkFavoriteStatus(product.product_id);
            }

            return (
              <TouchableOpacity
                key={product.product_id}
                style={styles.productCard}
                onPress={() => router.push(`/consumer/products/${product.product_id}`)}
              >
                <View style={styles.productImageContainer}>
                  {product.images && product.images.length > 0 ? (
                    <Image source={{ uri: product.images[0] }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImage}>
                      <Text style={styles.productImagePlaceholder}>🌾</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={(e) => handleToggleFavorite(product.product_id, e)}
                  >
                    <Text style={styles.favoriteIcon}>
                      {favoriteStatus[product.product_id] ? "❤️" : "🤍"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{product.variety_name}</Text>
                  <Text style={styles.productType}>{product.rice_type}</Text>
                  <Text style={styles.productPrice}>₱{product.price_per_kg}/kg</Text>
                  <Text style={styles.productAvailability}>
                    {product.available_quantity} {product.quantity_unit} available
                  </Text>
                  {product.average_rating > 0 && (
                    <Text style={styles.productRating}>
                      ⭐ {product.average_rating.toFixed(1)} ({product.total_reviews})
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { alignItems: "center", justifyContent: "center" },
  farmerHeader: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  farmerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  farmerImagePlaceholder: { fontSize: 50 },
  farmerName: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 8 },
  farmerAddress: { fontSize: 14, color: "#666", marginBottom: 8 },
  farmerRating: { fontSize: 14, color: "#666" },
  productsSection: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "600", color: "#333", marginBottom: 16 },
  emptyState: { alignItems: "center", padding: 40 },
  emptyStateText: { fontSize: 16, color: "#666" },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    position: "relative",
    marginRight: 12,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteIcon: {
    fontSize: 16,
  },
  productImagePlaceholder: { fontSize: 40 },
  productDetails: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  productType: { fontSize: 12, color: "#666", marginBottom: 4 },
  productPrice: { fontSize: 18, fontWeight: "bold", color: "#2d5016", marginBottom: 4 },
  productAvailability: { fontSize: 12, color: "#666", marginBottom: 4 },
  productRating: { fontSize: 12, color: "#666" },
});

