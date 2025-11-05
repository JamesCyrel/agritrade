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
import { useRouter } from "expo-router";
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

  const renderProductCard = (product) => (
    <TouchableOpacity
      key={product.product_id}
      style={styles.card}
      onPress={() => router.push(`/consumer/products/${product.product_id}`)}
    >
      {product.images && product.images.length > 0 ? (
        <Image source={{ uri: product.images[0] }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImage}>
          <Text style={styles.cardImagePlaceholder}>🌾</Text>
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>
        {product.variety_name}
      </Text>
      <Text style={styles.cardFarmName} numberOfLines={1}>
        {product.farm_name}
      </Text>
      <Text style={styles.cardPrice}>₱{product.price_per_kg}/kg</Text>
      {product.average_rating > 0 && (
        <Text style={styles.cardRating}>
          ⭐ {product.average_rating.toFixed(1)} ({product.total_reviews})
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderFarmerCard = (farmer) => {
    if (!farmer || !farmer.farmer_id) return null;
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
        {farmer.farm_name || farmer.full_name}
      </Text>
      {farmer.address && (
        <Text style={styles.cardLocation} numberOfLines={1}>
          {farmer.address}
        </Text>
      )}
      {farmer.average_rating > 0 && (
        <Text style={styles.cardRating}>
          ⭐ {farmer.average_rating.toFixed(1)} ({farmer.total_reviews} reviews)
        </Text>
      )}
      <Text style={styles.cardProducts}>{farmer.product_count} products</Text>
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
              {homepageData.featured_farmers.map((farmer) => renderFarmerCard(farmer))}
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
              {homepageData.popular_varieties.map((product) => renderProductCard(product))}
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
              {homepageData.new_arrivals.map((product) => renderProductCard(product))}
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
  cardImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
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
