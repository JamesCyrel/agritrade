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
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../services/api";

export default function ConsumerHomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [homepageData, setHomepageData] = useState({
    featured_farmers: [],
    popular_varieties: [],
    new_arrivals: [],
  });
  const [favoriteStatus, setFavoriteStatus] = useState({}); // { productId: isFavorite }

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.getHomepage(token);
      if (res.success) {
        setHomepageData(res.data || {
          featured_farmers: [],
          popular_varieties: [],
          new_arrivals: [],
        });
      }
    } catch (error) {
      console.error("Load homepage error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHomepageData();
  }, []);

  // Refresh favorite status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Get all product IDs from current homepage data
      const allProducts = [
        ...(homepageData.popular_varieties || []),
        ...(homepageData.new_arrivals || []),
      ];

      if (allProducts.length === 0) return;

      const refreshFavoriteStatus = async () => {
        try {
          const token = await AsyncStorage.getItem("authToken");
          // Check favorite status for all products in parallel
          const favoriteChecks = await Promise.all(
            allProducts.map(async (product) => {
              try {
                const res = await consumerAPI.checkFavorite(token, product.product_id);
                return {
                  productId: product.product_id,
                  isFavorite: res.success ? res.isFavorite : false,
                };
              } catch (error) {
                console.error(`Error checking favorite for product ${product.product_id}:`, error);
                return null;
              }
            })
          );

          // Update favorite status state
          setFavoriteStatus((prev) => {
            const newFavoriteStatus = { ...prev };
            favoriteChecks.forEach((check) => {
              if (check) {
                newFavoriteStatus[check.productId] = check.isFavorite;
              }
            });
            return newFavoriteStatus;
          });
        } catch (error) {
          console.error("Refresh favorite status error:", error);
        }
      };

      refreshFavoriteStatus();
    }, [homepageData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHomepageData();
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: "/consumer/search",
        params: { q: searchQuery },
      });
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

  const renderProductCard = (product) => {
    if (!product || !product.product_id) return null;
    
    // Check favorite status when product is first rendered
    if (favoriteStatus[product.product_id] === undefined) {
      checkFavoriteStatus(product.product_id);
    }

    const price = product.price_per_kg != null && !isNaN(parseFloat(product.price_per_kg)) 
      ? parseFloat(product.price_per_kg).toFixed(2) 
      : "0.00";

    return (
      <TouchableOpacity
        key={product.product_id}
        style={styles.card}
        onPress={() => router.push(`/consumer/products/${product.product_id}`)}
      >
        <View style={styles.cardImageContainer}>
          {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
            <Image source={{ uri: product.images[0] }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardImage}>
              <Text style={styles.cardImagePlaceholder}>🌾</Text>
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
        <Text style={styles.cardTitle} numberOfLines={1}>
          {String(product.variety_name || "Unknown Variety")}
        </Text>
        <Text style={styles.cardFarmName} numberOfLines={1}>
          {String(product.farm_name || "Unknown Farm")}
        </Text>
        <Text style={styles.cardPrice}>₱{price}/kg</Text>
        {product.average_rating != null && !isNaN(parseFloat(product.average_rating)) && parseFloat(product.average_rating) > 0 && (
          <Text style={styles.cardRating}>
            ⭐ {parseFloat(product.average_rating).toFixed(1)} ({String(product.total_reviews || 0)})
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderFarmerCard = (farmer) => {
    if (!farmer || !farmer.farmer_id) return null;
    
    const farmerName = String(farmer.farm_name || farmer.full_name || "Unknown Farm");
    const productCount = farmer.product_count != null ? Number(farmer.product_count) : 0;
    
    return (
      <TouchableOpacity
        key={farmer.farmer_id}
        style={styles.card}
        onPress={() => router.push(`/consumer/farmers/${farmer.farmer_id}/storefront`)}
      >
      <View style={styles.cardImage}>
        <Text style={styles.cardImagePlaceholder}>🚜</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {farmerName}
      </Text>
      {farmer.address && String(farmer.address).trim() && (
        <Text style={styles.cardLocation} numberOfLines={1}>
          {String(farmer.address)}
        </Text>
      )}
      {farmer.average_rating != null && !isNaN(parseFloat(farmer.average_rating)) && parseFloat(farmer.average_rating) > 0 && (
        <Text style={styles.cardRating}>
          ⭐ {parseFloat(farmer.average_rating).toFixed(1)} ({String(farmer.total_reviews || 0)} reviews)
        </Text>
      )}
      <Text style={styles.cardProducts}>{String(productCount)} products</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>AgriTrade</Text>
          <TouchableOpacity onPress={() => router.push("/consumer/profile")}>
            <Text style={styles.headerIcon}>👤</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Fresh Rice, Direct from Farmers</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2d5016"]} />}
      >
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for rice varieties or farmers..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Farmers */}
        {homepageData.featured_farmers && homepageData.featured_farmers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Farmers</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {homepageData.featured_farmers
                .filter((farmer) => farmer && farmer.farmer_id)
                .map((farmer) => renderFarmerCard(farmer))}
            </ScrollView>
          </View>
        )}

        {/* Popular Rice Varieties */}
        {homepageData.popular_varieties && homepageData.popular_varieties.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Rice Varieties</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {homepageData.popular_varieties
                .filter((product) => product && product.product_id)
                .map((product) => renderProductCard(product))}
            </ScrollView>
          </View>
        )}

        {/* New Arrivals */}
        {homepageData.new_arrivals && homepageData.new_arrivals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Arrivals</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {homepageData.new_arrivals
                .filter((product) => product && product.product_id)
                .map((product) => renderProductCard(product))}
            </ScrollView>
          </View>
        )}

        {homepageData.featured_farmers?.length === 0 &&
          homepageData.popular_varieties?.length === 0 &&
          homepageData.new_arrivals?.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products available yet</Text>
            </View>
          )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    backgroundColor: "#2d5016",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerIcon: {
    fontSize: 24,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e0e0",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 50,
  },
  searchIcon: {
    fontSize: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
    marginBottom: 8,
  },
  cardImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteIcon: {
    fontSize: 18,
  },
  cardImagePlaceholder: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  cardFarmName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  cardRating: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2d5016",
    marginTop: 4,
  },
  cardProducts: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 50,
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
