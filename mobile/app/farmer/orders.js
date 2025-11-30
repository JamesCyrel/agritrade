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
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { farmerOrderAPI } from "../../services/api";
import { ClipboardList, Clock, CheckCircle, Truck, PartyPopper, XCircle } from "lucide-react-native";

const ORDER_STATUSES = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

const STATUS_TABS = [
  { key: null, label: "All", status: null, Icon: ClipboardList },
  { key: ORDER_STATUSES.PENDING, label: "Pending", status: ORDER_STATUSES.PENDING, Icon: Clock },
  { key: ORDER_STATUSES.CONFIRMED, label: "Confirmed", status: ORDER_STATUSES.CONFIRMED, Icon: CheckCircle },
  { key: ORDER_STATUSES.OUT_FOR_DELIVERY, label: "Out for Delivery", status: ORDER_STATUSES.OUT_FOR_DELIVERY, Icon: Truck },
  { key: ORDER_STATUSES.DELIVERED, label: "Completed", status: ORDER_STATUSES.DELIVERED, Icon: PartyPopper },
  { key: ORDER_STATUSES.CANCELLED, label: "Canceled", status: ORDER_STATUSES.CANCELLED, Icon: XCircle },
];

const getStatusColor = (status) => {
  switch (status) {
    case ORDER_STATUSES.PENDING:
      return "#ff9800";
    case ORDER_STATUSES.CONFIRMED:
      return "#2196f3";
    case ORDER_STATUSES.PREPARING:
      return "#9c27b0";
    case ORDER_STATUSES.OUT_FOR_DELIVERY:
      return "#00bcd4";
    case ORDER_STATUSES.DELIVERED:
      return "#4caf50";
    case ORDER_STATUSES.CANCELLED:
      return "#f44336";
    default:
      return "#666";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case ORDER_STATUSES.PENDING:
      return "PENDING";
    case ORDER_STATUSES.CONFIRMED:
      return "CONFIRMED";
    case ORDER_STATUSES.PREPARING:
      return "PREPARING";
    case ORDER_STATUSES.OUT_FOR_DELIVERY:
      return "OUT FOR DELIVERY";
    case ORDER_STATUSES.DELIVERED:
      return "COMPLETED";
    case ORDER_STATUSES.CANCELLED:
      return "CANCELLED";
    default:
      return status;
  }
};

export default function FarmerOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);

  const loadOrders = async (status = null) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await farmerOrderAPI.getOrders(token, status);
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch (error) {
      console.error("Load orders error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadOrders(selectedTab);
    }, [selectedTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(selectedTab);
  };

  const handleTabPress = (tab) => {
    setSelectedTab(tab.status);
    setLoading(true);
  };

  const getStatusLabelForHeader = (status) => {
    if (!status) return "All Orders";
    switch (status) {
      case ORDER_STATUSES.PENDING:
        return "Pending";
      case ORDER_STATUSES.CONFIRMED:
        return "Confirmed";
      case ORDER_STATUSES.OUT_FOR_DELIVERY:
        return "Out for Delivery";
      case ORDER_STATUSES.DELIVERED:
        return "Completed";
      case ORDER_STATUSES.CANCELLED:
        return "Canceled";
      default:
        return "All Orders";
    }
  };

  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>
          {getStatusLabelForHeader(selectedTab)} • {orders.length} {orders.length === 1 ? "order" : "orders"}
        </Text>
      </View>

      {/* Status Tabs - Card Style */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabCard,
                selectedTab === tab.status && styles.tabCardActive,
              ]}
              onPress={() => handleTabPress(tab)}
            >
              <tab.Icon size={20} color={selectedTab === tab.status ? "#fff" : "#666"} style={{ marginBottom: 4 }} />
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab.status && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        contentContainerStyle={styles.ordersListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d5016" />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={60} color="#ccc" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateText}>No orders found</Text>
            <Text style={styles.emptyStateSubtext}>
              {selectedTab ? `No ${getStatusLabelForHeader(selectedTab).toLowerCase()} orders yet` : "You don't have any orders yet"}
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.order_id}
              order={order}
              onPress={() => {
                router.push(`/farmer/orders/${order.order_id}`);
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function OrderCard({ order, onPress }) {
  const statusColor = getStatusColor(order.status);
  const statusLabel = getStatusLabel(order.status);
  
  // Parse items if it's a JSON string
  let items = [];
  if (order.items) {
    if (typeof order.items === 'string') {
      try {
        items = JSON.parse(order.items);
      } catch (e) {
        items = [];
      }
    } else if (Array.isArray(order.items)) {
      items = order.items;
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const getConsumerName = () => {
    if (order.consumer_email) {
      const emailParts = order.consumer_email.split("@")[0];
      // Capitalize first letter
      return emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
    }
    return "Customer";
  };

  // Shorten order number for display
  const shortenOrderNumber = (orderNumber) => {
    if (!orderNumber) return "N/A";
    // Show first 8 chars and last 4 chars if too long
    if (orderNumber.length > 20) {
      return `${orderNumber.substring(0, 8)}...${orderNumber.substring(orderNumber.length - 4)}`;
    }
    return orderNumber;
  };

  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.orderCardHeader}>
        <View style={styles.orderCardLeft}>
          <Text style={styles.orderNumber}>{shortenOrderNumber(order.order_number)}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.orderCardBody}>
        <View style={styles.orderInfoRow}>
          <Text style={styles.orderInfoIcon}>👤</Text>
          <Text style={styles.orderInfoText} numberOfLines={1}>{getConsumerName()}</Text>
        </View>
        
        {order.delivery_address && (
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoIcon}>📍</Text>
            <Text style={styles.orderInfoText} numberOfLines={1}>
              {order.delivery_address}
            </Text>
          </View>
        )}
        
        <View style={styles.orderInfoRow}>
          <Text style={styles.orderInfoIcon}>📦</Text>
          <Text style={styles.orderInfoText}>
            {items.length || 0} {items.length === 1 ? "item" : "items"}
          </Text>
        </View>
      </View>

      <View style={styles.orderCardFooter}>
        <View>
          <Text style={styles.orderTotalLabel}>Total Amount</Text>
          <Text style={styles.orderTotal}>₱{parseFloat(order.total_amount || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.paymentBadge}>
          <Text style={styles.paymentIcon}>
            {order.payment_type === "COD" ? "💰" : "💳"}
          </Text>
          <Text style={styles.paymentType}>
            {order.payment_type === "COD" ? "COD" : "Digital"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  header: {
    backgroundColor: "#2d5016",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e0e0",
    fontWeight: "500",
  },
  tabsWrapper: {
    backgroundColor: "#fff",
    paddingTop: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabsContainer: {
    backgroundColor: "transparent",
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabCardActive: {
    backgroundColor: "#2d5016",
    borderColor: "#2d5016",
  },
  tabIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    padding: 16,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "#fff",
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  orderCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  orderDate: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orderCardBody: {
    marginBottom: 16,
  },
  orderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  orderInfoIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: "center",
  },
  orderInfoText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
    flex: 1,
  },
  orderCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  orderTotalLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2d5016",
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  paymentIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  paymentType: {
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    paddingBottom: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
