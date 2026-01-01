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
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI, getImageUrl } from "../../services/api";
import { Wheat, X } from "lucide-react-native";

export default function ConsumerCartScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cartData, setCartData] = useState({ items: [], subtotal: 0, item_count: 0 });

  const loadCart = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.getCart(token);
      if (res.success) {
        setCartData(res.data || { items: [], subtotal: 0, item_count: 0 });
      } else {
        Alert.alert("Error", res.message || "Failed to load cart");
      }
    } catch (error) {
      console.error("Load cart error:", error);
      Alert.alert("Error", "Failed to load cart");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCart();
  };

  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (parseFloat(newQuantity) <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.updateCartItem(token, cartItemId, newQuantity);
      if (res.success) {
        await loadCart();
      } else {
        Alert.alert("Error", res.message || "Failed to update quantity");
      }
    } catch (error) {
      console.error("Update quantity error:", error);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  const handleRemoveItem = async (cartItemId) => {
    Alert.alert("Remove Item", "Remove this item from cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("authToken");
            const res = await consumerAPI.removeCartItem(token, cartItemId);
            if (res.success) {
              await loadCart();
            } else {
              Alert.alert("Error", res.message || "Failed to remove item");
            }
          } catch (error) {
            console.error("Remove item error:", error);
            Alert.alert("Error", "Failed to remove item");
          }
        },
      },
    ]);
  };

  const deliveryFee = 50; // Base delivery fee
  const tax = cartData.subtotal * 0.12; // 12% tax
  const total = cartData.subtotal + deliveryFee + tax;

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <Text style={styles.headerSubtitle}>
          {cartData.item_count} {cartData.item_count === 1 ? "item" : "items"}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2d5016"]} />}
      >
        {cartData.items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Your cart is empty</Text>
            <Text style={styles.emptyStateSubtext}>Add items to get started</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push("/consumer/home")}
            >
              <Text style={styles.shopButtonText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {cartData.items.map((item) => (
              <View key={item.cart_item_id} style={styles.cartItem}>
                {item.images && item.images.length > 0 ? (
                  <Image source={{ uri: getImageUrl(item.images[0]) }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImage}>
                    <Wheat size={40} color="#ccc" />
                  </View>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.variety_name}</Text>
                  <Text style={styles.itemFarm}>{item.farm_name}</Text>
                  <Text style={styles.itemPrice}>
                    ₱{item.unit_price} {item.sack_size_kg ? `per ${item.sack_size_kg}kg sack` : "per kg"}
                  </Text>
                  <Text style={styles.itemType}>{item.rice_type}</Text>

                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleUpdateQuantity(item.cart_item_id, parseFloat(item.quantity) - 1)}
                    >
                      <Text style={styles.quantityButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity} {item.sack_size_kg ? 'sacks' : 'kg'}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleUpdateQuantity(item.cart_item_id, parseFloat(item.quantity) + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemTotal}>₱{parseFloat(item.item_total || 0).toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(item.cart_item_id)}
                >
                  <X size={18} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₱{parseFloat(cartData.subtotal || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>₱{deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (12%)</Text>
                <Text style={styles.summaryValue}>₱{tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => router.push("/consumer/checkout")}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { alignItems: "center", justifyContent: "center" },
  header: {
    backgroundColor: "#2d5016",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#e0e0e0" },
  content: { flex: 1 },
  emptyState: { alignItems: "center", marginTop: 100, padding: 20 },
  emptyStateText: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: "#666", marginBottom: 24 },
  shopButton: {
    backgroundColor: "#2d5016",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  cartItem: {
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
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemImagePlaceholder: { fontSize: 40 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  itemFarm: { fontSize: 12, color: "#666", marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: "600", color: "#2d5016", marginBottom: 4 },
  itemType: { fontSize: 12, color: "#999", marginBottom: 8 },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  quantityText: { marginHorizontal: 16, fontSize: 14, color: "#333", minWidth: 60 },
  itemTotal: { fontSize: 16, fontWeight: "bold", color: "#2d5016" },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffebee",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  removeButtonText: { fontSize: 18, fontWeight: "bold", color: "#d32f2f" },
  summary: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryValue: { fontSize: 14, color: "#333" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 18, fontWeight: "bold", color: "#333" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#2d5016" },
  checkoutButton: {
    backgroundColor: "#2d5016",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 40,
  },
  checkoutButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
