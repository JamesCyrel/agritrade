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
import { consumerAPI, getImageUrl } from "../../../../services/api";
import { Tractor, MapPin, Star, Wheat, Heart } from "lucide-react-native";

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

  if (!storefront || !storefront.farmer) {
    return null;
  }

  const { farmer, products } = storefront;
  const farmerName = String(farmer.farm_name || farmer.full_name || "Unknown Farm");

  return (
    <ScrollView style={styles.container}>
      {/* Farmer Header */}
      <View style={styles.farmerHeader}>
        <View style={styles.farmerImage}>
          <Tractor size={50} color="#2d5016" />
        </View>
        <Text style={styles.farmerName}>{farmerName}</Text>
        {farmer.address && String(farmer.address).trim() && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MapPin size={14} color="#666" />
            <Text style={styles.farmerAddress}>{String(farmer.address)}</Text>
          </View>
        )}
        {farmer.average_rating != null && !isNaN(parseFloat(farmer.average_rating)) && parseFloat(farmer.average_rating) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Star size={14} color="#f1c40f" fill="#f1c40f" />
            <Text style={styles.farmerRating}>
              {parseFloat(farmer.average_rating).toFixed(1)} ({String(farmer.total_reviews || 0)} reviews)
            </Text>
          </View>
        )}
      </View>

      {/* Products Section */}
      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>
          Products ({Array.isArray(products) ? products.length : 0})
        </Text>
        {!Array.isArray(products) || products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No products available</Text>
          </View>
        ) : (
          products
            .filter((product) => product && product.product_id)
            .map((product) => {
              // Check favorite status when product is first rendered
              if (favoriteStatus[product.product_id] === undefined) {
                checkFavoriteStatus(product.product_id);
              }

              const price = product.price_per_kg != null && !isNaN(parseFloat(product.price_per_kg))
                ? parseFloat(product.price_per_kg).toFixed(2)
                : "0.00";
              const quantity = product.available_quantity != null ? String(product.available_quantity) : "0";
              const unit = String(product.quantity_unit || "kg");

              return (
                <TouchableOpacity
                  key={product.product_id}
                  style={styles.productCard}
                  onPress={() => router.push(`/consumer/products/${product.product_id}`)}
                >
                  <View style={styles.productImageContainer}>
                    {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
                      <Image source={{ uri: getImageUrl(product.images[0]) }} style={styles.productImage} />
                    ) : (
                      <View style={styles.productImage}>
                        <Wheat size={40} color="#2d5016" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={(e) => handleToggleFavorite(product.product_id, e)}
                    >
                      <Heart
                        size={20}
                        color={favoriteStatus[product.product_id] ? "#e74c3c" : "#666"}
                        fill={favoriteStatus[product.product_id] ? "#e74c3c" : "transparent"}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{String(product.variety_name || "Unknown Variety")}</Text>
                    <Text style={styles.productType}>{String(product.rice_type || "")}</Text>
                    <Text style={styles.productPrice}>₱{price}/kg</Text>
                    <Text style={styles.productAvailability}>
                      {quantity} {unit} available
                    </Text>
                    {product.average_rating != null && !isNaN(parseFloat(product.average_rating)) && parseFloat(product.average_rating) > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Star size={12} color="#f1c40f" fill="#f1c40f" />
                        <Text style={styles.productRating}>
                          {parseFloat(product.average_rating).toFixed(1)} ({String(product.total_reviews || 0)})
                        </Text>
                      </View>
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

