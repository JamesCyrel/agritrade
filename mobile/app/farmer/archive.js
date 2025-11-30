import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { productAPI, getImageUrl } from "../../services/api";

export default function ArchiveScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadArchivedProducts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await productAPI.getArchivedProducts(token);
      if (res.success) {
        setProducts(res.data || []);
      } else {
        Alert.alert("Error", res.message || "Failed to load archived products");
      }
    } catch (e) {
      console.error("Load archived products error:", e);
      Alert.alert("Error", e.message || "Failed to load archived products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadArchivedProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadArchivedProducts();
  };

  const handleUnarchive = (product) => {
    Alert.alert(
      "Unarchive Product",
      `Unarchive "${product.variety_name}"? It will be moved back to Products as inactive.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unarchive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const res = await productAPI.unarchiveProduct(token, product.product_id);
              if (res.success) {
                Alert.alert("Success", "Product unarchived. You can activate it in the Products tab.");
                await loadArchivedProducts();
              } else {
                Alert.alert("Error", res.message || "Failed to unarchive product");
              }
            } catch (e) {
              Alert.alert("Error", e.message || "Failed to unarchive product");
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Archived Products</Text>
        <Text style={styles.headerSubtitle}>Products you've archived</Text>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No archived products</Text>
          <Text style={styles.emptySubtext}>Archived products will appear here</Text>
        </View>
      ) : (
        products.map((product) => (
          <View key={product.product_id} style={styles.productCard}>
            <View style={styles.productHeader}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.variety_name}</Text>
                <Text style={styles.productType}>
                  {product.rice_type === 'MILLED' ? 'Milled' : 'Unmilled/Paddy'}
                </Text>
              </View>
              <View style={[styles.statusBadge, styles.archivedBadge]}>
                <Text style={[styles.statusText, styles.archivedText]}>Archived</Text>
              </View>
            </View>

            {product.images && product.images.length > 0 && (
              <Image
                source={{ uri: getImageUrl(product.images[0]) }}
                style={styles.productImage}
                defaultSource={require('../../assets/images/icon.png')}
              />
            )}

            <View style={styles.productDetails}>
              <Text style={styles.price}>₱{product.price_per_kg}/kg</Text>
              <Text style={styles.quantity}>
                Quantity: {product.available_quantity} {product.quantity_unit}
              </Text>
              {product.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {product.description}
                </Text>
              )}
            </View>

            <View style={styles.productActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.unarchiveButton]}
                onPress={() => handleUnarchive(product)}
              >
                <Text style={styles.actionButtonText}>Unarchive</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  contentContainer: { padding: 16, paddingTop: 20 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#2d5016", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#666" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#666", textAlign: "center" },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 4 },
  productType: { fontSize: 12, color: "#666" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  archivedBadge: { backgroundColor: "#6c757d" },
  statusText: { fontSize: 12, fontWeight: "600" },
  archivedText: { color: "#fff" },
  productImage: { width: "100%", height: 200, borderRadius: 8, marginBottom: 12, backgroundColor: "#f0f0f0" },
  productDetails: { marginBottom: 12 },
  price: { fontSize: 20, fontWeight: "bold", color: "#2d5016", marginBottom: 4 },
  quantity: { fontSize: 14, color: "#666", marginBottom: 8 },
  description: { fontSize: 14, color: "#333", lineHeight: 20 },
  productActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionButton: { flex: 1, backgroundColor: "#2d5016", borderRadius: 6, padding: 10, alignItems: "center" },
  actionButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  unarchiveButton: { backgroundColor: "#17a2b8" },
});

