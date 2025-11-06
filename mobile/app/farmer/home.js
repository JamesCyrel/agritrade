import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { farmerOrderAPI, productAPI, farmerAPI, farmerReviewAPI } from "../../services/api";

export default function FarmerHomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeProducts, setActiveProducts] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [avgRating, setAvgRating] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");

      const [pendingRes, ordersRes, productsRes, ledgerRes, reviewsRes] = await Promise.all([
        farmerOrderAPI.getOrders(token, 'PENDING'),
        farmerOrderAPI.getOrders(token),
        productAPI.getProducts(token, false),
        farmerAPI.getLedger(token),
        farmerReviewAPI.getReviews(token, 5, 0),
      ]);

      if (pendingRes?.success) setPendingCount((pendingRes.data || []).length);
      if (ordersRes?.success) setRecentOrders((ordersRes.data || []).slice(0, 5));
      if (productsRes?.success) setActiveProducts((productsRes.data || []).filter(p => p.status === 'ACTIVE').length || 0);
      if (ledgerRes?.success) {
        const raw = ledgerRes.data;
        setCurrentBalance(parseFloat(Array.isArray(raw) ? 0 : (raw?.currentBalance || 0)) || 0);
      }
      if (reviewsRes?.success) {
        const list = reviewsRes.data?.reviews || reviewsRes.data || [];
        const ratings = list.map(r => parseFloat(r.rating || 0)).filter(n => n > 0);
        if (ratings.length > 0) setAvgRating((ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1));
      }
    } catch (e) {
      console.log('Farmer home load error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Farm Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back! 👋</Text>
      </View>

      <ScrollView style={styles.content}>
        {pendingCount > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>
              ⚠️ You have {pendingCount} new order{pendingCount>1?'s':''} waiting for confirmation
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ff9800' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2d5016' }]}>₱{currentBalance.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2196f3' }]}>{activeProducts}</Text>
            <Text style={styles.statLabel}>Active Products</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ffc107' }]}>{avgRating ? `${avgRating} ⭐` : 'N/A'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {recentOrders.map((order, index) => (
          <TouchableOpacity
            key={order.order_id || index}
            style={styles.orderCard}
            onPress={() => {
              router.push(`/farmer/orders/${order.order_id}`);
            }}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>{order.order_number}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      order.status === "PENDING"
                        ? "#fff3cd"
                        : order.status === "CONFIRMED"
                        ? "#d4edda"
                        : order.status === "OUT_FOR_DELIVERY"
                        ? "#cfe2ff"
                        : order.status === "CANCELLED"
                        ? "#f8d7da"
                        : "#d1e7dd",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        order.status === "PENDING"
                          ? "#856404"
                          : order.status === "CONFIRMED"
                          ? "#155724"
                          : order.status === "OUT_FOR_DELIVERY"
                          ? "#004085"
                          : order.status === "CANCELLED"
                          ? "#842029"
                          : "#0f5132",
                    },
                  ]}
                >
                  {order.status.replace('_',' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.orderCustomer}>Customer: {order.consumer_name || order.consumer_email || 'Unknown'}</Text>
            <Text style={styles.orderAmount}>₱{parseFloat(order.total_amount||0).toFixed(2)}</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                router.push(`/farmer/orders/${order.order_id}`);
              }}
            >
              <Text style={styles.actionButtonText}>
                {order.status === "PENDING" ? "Accept Order" : "View Details"}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
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
  alertBanner: {
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  alertText: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
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
  orderCustomer: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2d5016",
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

