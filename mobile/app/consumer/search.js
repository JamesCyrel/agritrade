import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../services/api";

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState({});
  
  // Filter states
  const [riceType, setRiceType] = useState(null); // 'MILLED' | 'UNMILLED_PADDY' | null
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistance, setMaxDistance] = useState(null); // 25, 50, 100, null
  const [minRating, setMinRating] = useState(null); // 4, 4.5, null
  const [sortBy, setSortBy] = useState("newest"); // 'newest', 'price_low', 'price_high', 'rating', 'distance'

  const performSearch = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      
      // Get consumer location if available (from saved address)
      // For now, we'll leave it null - can be enhanced later
      const searchParams = {
        q: searchQuery,
        rice_type: riceType,
        min_price: minPrice ? parseFloat(minPrice) : null,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        max_distance: maxDistance,
        min_rating: minRating,
        sort_by: sortBy,
        limit: 50,
      };

      const res = await consumerAPI.searchProducts(token, searchParams);
      if (res.success) {
        setProducts(res.data || []);
      } else {
        Alert.alert("Error", res.message || "Failed to search products");
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to search products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery || riceType || minPrice || maxPrice || maxDistance || minRating) {
      performSearch();
    }
  }, [sortBy]);

  const handleSearch = () => {
    performSearch();
  };

  const clearFilters = () => {
    setRiceType(null);
    setMinPrice("");
    setMaxPrice("");
    setMaxDistance(null);
    setMinRating(null);
    setSortBy("newest");
    performSearch();
  };

  const applyFilters = () => {
    setShowFilters(false);
    performSearch();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for rice varieties or farmers..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterIcon}><Image 
              source={require('../../assets/icons/search.png')} 
              style={{ width: 24, height: 24, tintColor: '#fff' }}
            /></Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { value: "newest", label: "Newest" },
            { value: "price_low", label: "Price: Low to High" },
            { value: "price_high", label: "Price: High to Low" },
            { value: "rating", label: "Rating" },
            { value: "distance", label: "Distance" },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.sortButton, sortBy === option.value && styles.sortButtonActive]}
              onPress={() => setSortBy(option.value)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option.value && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2d5016" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products found</Text>
              <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
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
                    <Text style={styles.productFarm}>{product.farm_name}</Text>
                    <Text style={styles.productPrice}>₱{product.price_per_kg}/kg</Text>
                    <Text style={styles.productType}>{product.rice_type}</Text>
                    {product.distance_km && (
                      <Text style={styles.productDistance}>
                        📍 {product.distance_km.toFixed(1)} km away
                      </Text>
                    )}
                    {product.average_rating > 0 && (
                      <Text style={styles.productRating}>
                        ⭐ {product.average_rating.toFixed(1)} ({product.total_reviews} reviews)
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Filters Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Rice Type */}
              <Text style={styles.filterLabel}>Rice Type</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, riceType === "MILLED" && styles.filterOptionActive]}
                  onPress={() => setRiceType(riceType === "MILLED" ? null : "MILLED")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      riceType === "MILLED" && styles.filterOptionTextActive,
                    ]}
                  >
                    Milled
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    riceType === "UNMILLED_PADDY" && styles.filterOptionActive,
                  ]}
                  onPress={() =>
                    setRiceType(riceType === "UNMILLED_PADDY" ? null : "UNMILLED_PADDY")
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      riceType === "UNMILLED_PADDY" && styles.filterOptionTextActive,
                    ]}
                  >
                    Unmilled/Paddy
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Price Range */}
              <Text style={styles.filterLabel}>Price Range (₱)</Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Distance */}
              <Text style={styles.filterLabel}>Maximum Distance</Text>
              <View style={styles.filterOptions}>
                {[25, 50, 100].map((distance) => (
                  <TouchableOpacity
                    key={distance}
                    style={[
                      styles.filterOption,
                      maxDistance === distance && styles.filterOptionActive,
                    ]}
                    onPress={() => setMaxDistance(maxDistance === distance ? null : distance)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        maxDistance === distance && styles.filterOptionTextActive,
                      ]}
                    >
                      {distance} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rating */}
              <Text style={styles.filterLabel}>Minimum Rating</Text>
              <View style={styles.filterOptions}>
                {[4, 4.5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.filterOption,
                      minRating === rating && styles.filterOptionActive,
                    ]}
                    onPress={() => setMinRating(minRating === rating ? null : rating)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        minRating === rating && styles.filterOptionTextActive,
                      ]}
                    >
                      {rating}+ ⭐
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingTop: 50,
  },
  backButton: { marginRight: 12 },
  backButtonText: { fontSize: 24, color: "#2d5016" },
  searchInput: { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 8, padding: 10, fontSize: 14 },
  filterButton: { marginLeft: 8, padding: 8, backgroundColor: '#2d5016', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterIcon: { fontSize: 20 },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  sortLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginRight: 12 },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  sortButtonActive: { backgroundColor: "#2d5016" },
  sortButtonText: { fontSize: 12, color: "#666" },
  sortButtonTextActive: { color: "#fff", fontWeight: "600" },
  content: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", marginTop: 50, padding: 20 },
  emptyStateText: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: "#666" },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 12,
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
  productFarm: { fontSize: 12, color: "#666", marginBottom: 4 },
  productPrice: { fontSize: 18, fontWeight: "bold", color: "#2d5016", marginBottom: 4 },
  productType: { fontSize: 12, color: "#999", marginBottom: 2 },
  productDistance: { fontSize: 12, color: "#666", marginBottom: 2 },
  productRating: { fontSize: 12, color: "#666" },
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
  filterLabel: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12, marginTop: 8 },
  filterOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterOptionActive: { backgroundColor: "#2d5016", borderColor: "#2d5016" },
  filterOptionText: { fontSize: 14, color: "#666" },
  filterOptionTextActive: { color: "#fff", fontWeight: "600" },
  priceInputs: { flexDirection: "row", alignItems: "center", gap: 12 },
  priceInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  priceSeparator: { fontSize: 16, color: "#666" },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  clearButtonText: { fontSize: 16, fontWeight: "600", color: "#666" },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#2d5016",
    alignItems: "center",
  },
  applyButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});

