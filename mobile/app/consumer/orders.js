import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../services/api";

export default function ConsumerOrdersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.getOrders(token);
      if (res.success) {
        setOrders(res.data || []);
      } else {
        console.error("Load orders error:", res.message);
      }
    } catch (error) {
      console.error("Load orders error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "#ff9800";
      case "CONFIRMED":
        return "#2196f3";
      case "PREPARING":
        return "#9c27b0";
      case "OUT_FOR_DELIVERY":
        return "#00bcd4";
      case "DELIVERED":
        return "#4caf50";
      case "CANCELLED":
        return "#f44336";
      default:
        return "#666";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2d5016"]} />}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No orders yet</Text>
            <Text style={styles.emptyStateSubtext}>Start shopping to see your orders here</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push("/consumer/home")}
            >
              <Text style={styles.shopButtonText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.order_id}
              style={styles.orderCard}
              onPress={() => router.push(`/consumer/orders/${order.order_id}`)}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>{order.order_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status.replace("_", " ")}</Text>
                </View>
              </View>
              <Text style={styles.farmerName}>{order.farm_name || order.farmer_name}</Text>
              {order.delivery_address && (
                <Text style={styles.deliveryAddress}>📍 {order.delivery_address}</Text>
              )}
              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                <Text style={styles.orderTotal}>₱{parseFloat(order.total_amount).toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          ))
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
  content: { flex: 1, padding: 16 },
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
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderNumber: { fontSize: 16, fontWeight: "600", color: "#333" },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: "600", color: "#fff", textTransform: "capitalize" },
  farmerName: { fontSize: 14, fontWeight: "600", color: "#2d5016", marginBottom: 8 },
  deliveryAddress: { fontSize: 12, color: "#666", marginBottom: 12 },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  orderDate: { fontSize: 12, color: "#666" },
  orderTotal: { fontSize: 18, fontWeight: "bold", color: "#2d5016" },
});

