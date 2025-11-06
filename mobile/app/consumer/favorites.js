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
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../services/api";

export default function ConsumerFavoritesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.getFavorites(token);
      if (res.success) {
        setFavorites(res.data || []);
      } else {
        Alert.alert("Error", res.message || "Failed to load favorites");
      }
    } catch (error) {
      console.error("Load favorites error:", error);
      Alert.alert("Error", "Failed to load favorites");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const handleRemoveFavorite = async (productId) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.removeFavorite(token, productId);
      if (res.success) {
        setFavorites(favorites.filter((fav) => fav.product_id !== productId));
      } else {
        Alert.alert("Error", res.message || "Failed to remove favorite");
      }
    } catch (error) {
      console.error("Remove favorite error:", error);
      Alert.alert("Error", "Failed to remove favorite");
    }
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
        <Text style={styles.headerTitle}>Favorites</Text>
        <Text style={styles.headerSubtitle}>Your saved products</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2d5016"]} />}
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💔</Text>
            <Text style={styles.emptyStateText}>No favorites yet</Text>
            <Text style={styles.emptyStateSubtext}>Start adding products to your favorites!</Text>
          </View>
        ) : (
          favorites.map((item) => (
            <TouchableOpacity
              key={item.product_id}
              style={styles.favoriteCard}
              onPress={() => router.push(`/consumer/products/${item.product_id}`)}
            >
              {item.images && item.images.length > 0 ? (
                <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
              ) : (
                <View style={styles.itemImage}>
                  <Text style={styles.itemImagePlaceholder}>🌾</Text>
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.variety_name}</Text>
                <Text style={styles.itemFarmer}>{item.farm_name || item.farmer_name}</Text>
                {item.average_rating > 0 && (
                  <Text style={styles.itemRating}>
                    ⭐ {parseFloat(item.average_rating).toFixed(1)} ({item.total_reviews || 0})
                  </Text>
                )}
                <Text style={styles.itemPrice}>₱{item.price_per_kg}/kg</Text>
              </View>
              <TouchableOpacity
                style={styles.heartButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(item.product_id);
                }}
              >
                <Text style={styles.heartIcon}>❤️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
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
  header: {
    backgroundColor: "#2d5016",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e0e0",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  favoriteCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemImagePlaceholder: {
    fontSize: 32,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemFarmer: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  itemRating: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2d5016",
  },
  heartButton: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  heartIcon: {
    fontSize: 24,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 100,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

