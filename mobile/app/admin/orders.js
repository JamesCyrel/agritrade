import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { adminAPI } from "../../services/api";

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    loadOrders();
  }, []);

useEffect(() => {
  loadOrders();
}, [selectedStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const queryFilters = {};
      if (selectedStatus && selectedStatus !== "ALL") {
        queryFilters.status = selectedStatus;
      }
      
      const res = await adminAPI.getAllOrders(token, queryFilters);
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch (error) {
      console.error("Load orders error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "#fff3cd";
      case "CONFIRMED":
        return "#d4edda";
      case "OUT_FOR_DELIVERY":
        return "#cfe2ff";
      case "DELIVERED":
        return "#d1e7dd";
      case "CANCELLED":
        return "#f8d7da";
      default:
        return "#e0e0e0";
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case "PENDING":
        return "#856404";
      case "CONFIRMED":
        return "#155724";
      case "OUT_FOR_DELIVERY":
        return "#004085";
      case "DELIVERED":
        return "#0f5132";
      case "CANCELLED":
        return "#842029";
      default:
        return "#333";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
        <Text style={styles.headerTitle}>Order Monitoring</Text>
        <Text style={styles.headerSubtitle}>View and track all orders</Text>
      </View>

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { label: "All", value: "ALL" },
          { label: "Pending", value: "PENDING" },
          { label: "Confirmed", value: "CONFIRMED" },
          { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
          { label: "Delivered", value: "DELIVERED" },
          { label: "Cancelled", value: "CANCELLED" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.tabButton,
              selectedStatus === tab.value && styles.tabButtonActive,
            ]}
            onPress={() => setSelectedStatus(tab.value)}
          >
            <Text
              style={[
                styles.tabButtonText,
                selectedStatus === tab.value && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No orders found</Text>
          </View>
        ) : (
          orders.map((order, index) => (
            <TouchableOpacity
              key={order.order_id || index}
              style={styles.orderCard}
              onPress={() => {
                // Navigate to order details if needed
                // router.push(`/admin/orders/${order.order_id}`);
              }}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>{order.order_number}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusTextColor(order.status) },
                    ]}
                  >
                    {order.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderInfo}>
                Customer: {order.consumer_name || order.consumer_email || "Unknown"}
              </Text>
              <Text style={styles.orderInfo}>
                Farmer: {order.farm_name || order.farmer_name || "Unknown"}
              </Text>
              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                <Text style={styles.orderAmount}>₱{parseFloat(order.total_amount).toFixed(2)}</Text>
              </View>
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
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
  tabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  tabButtonActive: {
    borderColor: "#2d5016",
    backgroundColor: "#e8f5e9",
  },
  tabButtonText: {
    fontSize: 12,
    color: "#666",
  },
  tabButtonTextActive: {
    color: "#2d5016",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
  },
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
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2d5016",
  },
});
