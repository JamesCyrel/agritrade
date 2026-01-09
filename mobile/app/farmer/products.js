import React, { useState, useCallback } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { productAPI, getImageUrl } from "../../services/api";
import { Wheat, Edit, Archive, Power, Package } from "lucide-react-native";

export default function ProductsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await productAPI.getProducts(token, false); // Don't include archived
      if (res.success) {
        // Filter out archived products from main list
        setProducts((res.data || []).filter(p => p.status !== 'ARCHIVED'));
      } else {
        Alert.alert("Error", res.message || "Failed to load products");
      }
    } catch (e) {
      console.error("Load products error:", e);
      Alert.alert("Error", e.message || "Failed to load products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleArchive = (product) => {
    Alert.alert(
      "Archive Product",
      `Are you sure you want to archive "${product.variety_name}"? It will be moved to the Archive tab.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const res = await productAPI.archiveProduct(token, product.product_id);
              if (res.success) {
                Alert.alert("Success", "Product archived");
                await loadProducts();
              } else {
                Alert.alert("Error", res.message || "Failed to archive product");
              }
            } catch (e) {
              Alert.alert("Error", e.message || "Failed to archive product");
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await productAPI.updateProduct(token, product.product_id, { status: newStatus });
      if (res.success) {
        await loadProducts();
      } else {
        Alert.alert("Error", res.message || "Failed to update product status");
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update product status");
    }
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
        <Text style={styles.headerTitle}>My Products</Text>
        <Text style={styles.headerSubtitle}>Manage your product listings</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/farmer/products/create')}
        >
          <Text style={styles.addButtonText}>+ Create New Product</Text>
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products yet</Text>
          <Text style={styles.emptySubtext}>Create your first product listing to get started</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/farmer/products/create')}
          >
            <Text style={styles.emptyButtonText}>Create Product</Text>
          </TouchableOpacity>
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
              <View style={[styles.statusBadge, product.status === 'ACTIVE' ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={[styles.statusText, product.status === 'ACTIVE' ? styles.activeText : styles.inactiveText]}>
                  {product.status === 'ACTIVE' ? 'Active' : product.status === 'INACTIVE' ? 'Inactive' : product.status === 'OUT_OF_STOCK' ? 'Out of Stock' : product.status === 'ARCHIVED' ? 'Archived' : product.status}
                </Text>
              </View>
            </View>

            {product.images && product.images.length > 0 ? (
              <Image
                source={{ uri: getImageUrl(product.images[0]) }}
                style={styles.productImage}
                defaultSource={require('../../assets/images/icon.png')}
              />
            ) : (
              <View style={[styles.productImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
                <Wheat size={40} color="#ccc" />
              </View>
            )}

            <View style={styles.productDetails}>
              <Text style={styles.price}>₱{product.price_per_kg}/kg</Text>
              <Text style={styles.quantity}>
                Available: {product.available_quantity} {product.quantity_unit}
              </Text>
              {product.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {product.description}
                </Text>
              )}
            </View>

            <View style={styles.productActions}>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => router.push(`/farmer/products/create?id=${product.product_id}`)}
                >
                  <Edit size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.stockButton]}
                  onPress={() => router.push(`/farmer/products/inventory?id=${product.product_id}`)}
                >
                  <Package size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Stock</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton, product.status === 'ACTIVE' && styles.deactivateButton]}
                  onPress={() => handleToggleStatus(product)}
                  disabled={product.status === 'ARCHIVED'}
                >
                  <Power size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.archiveButton]}
                  onPress={() => handleArchive(product)}
                  disabled={product.status === 'ARCHIVED'}
                >
                  <Archive size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Archive</Text>
                </TouchableOpacity>
              </View>
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
  headerSubtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  addButton: { backgroundColor: "#2d5016", borderRadius: 8, padding: 14, alignItems: "center" },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#666", marginBottom: 24, textAlign: "center" },
  emptyButton: { backgroundColor: "#2d5016", borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  emptyButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
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
  activeBadge: { backgroundColor: "#d4edda" },
  inactiveBadge: { backgroundColor: "#f8d7da" },
  statusText: { fontSize: 12, fontWeight: "600" },
  activeText: { color: "#155724" },
  inactiveText: { color: "#721c24" },
  productImage: { width: "100%", height: 200, borderRadius: 8, marginBottom: 12, backgroundColor: "#f0f0f0" },
  productDetails: { marginBottom: 12 },
  price: { fontSize: 20, fontWeight: "bold", color: "#2d5016", marginBottom: 4 },
  quantity: { fontSize: 14, color: "#666", marginBottom: 8 },
  description: { fontSize: 14, color: "#333", lineHeight: 20 },
  productActions: { marginTop: 12, gap: 8 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  actionButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  editButton: { backgroundColor: "#2d5016" },
  stockButton: { backgroundColor: "#17a2b8" },
  toggleButton: { backgroundColor: "#28a745" },
  deactivateButton: { backgroundColor: "#ffc107" },
  archiveButton: { backgroundColor: "#6c757d" },
});
