import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { adminAPI } from "../../services/api";

export default function AdminHomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeOrders: 0,
    gmv: 0,
    pendingReviews: 0,
  });
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");

      // Fetch analytics for dashboard stats
      const analyticsRes = await adminAPI.getAnalytics(token);
      const usersRes = await adminAPI.listUsers(token);
      const ordersRes = await adminAPI.getAllOrders(token, { limit: 1 });

      if (analyticsRes.success && usersRes.success) {
        const analyticsData = analyticsRes.data;
        const users = usersRes.data || [];
        
        // Set full analytics data
        setAnalytics(analyticsData);
        
        // Count pending verifications (farmers with PENDING_REVIEW or PENDING_DOCUMENTS)
        const pendingFarmers = users.filter(
          (u) => u.role === "FARMER" && 
          (u.verification_status === "PENDING_REVIEW" || u.verification_status === "PENDING_DOCUMENTS")
        );

        setStats({
          totalUsers: users.length,
          activeOrders: ordersRes.success ? (ordersRes.pagination?.total || 0) : 0,
          gmv: analyticsData.gmv || 0,
          pendingReviews: pendingFarmers.length,
        });
      }
    } catch (error) {
      console.error("Load dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `₱${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `₱${(amount / 1000).toFixed(2)}K`;
    }
    return `₱${amount.toFixed(2)}`;
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
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Platform Management</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalUsers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.activeOrders.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{formatCurrency(stats.gmv)}</Text>
            <Text style={styles.statLabel}>Total GMV</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.pendingReviews}</Text>
            <Text style={styles.statLabel}>Pending Verifications</Text>
          </View>
        </View>

        {/* Analytics Section */}
        {analytics && (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{formatCurrency(analytics.platformRevenue || 0)}</Text>
                <Text style={styles.statLabel}>Platform Revenue</Text>
              </View>
              {analytics.orders?.total_orders > 0 && (
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>
                    {formatCurrency((analytics.gmv || 0) / analytics.orders.total_orders)}
                  </Text>
                  <Text style={styles.statLabel}>Avg Order Value</Text>
                </View>
              )}
            </View>

            {/* User Registrations by Role */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Registrations by Role</Text>
              {analytics.userRegistrations?.map((reg, index) => (
                <View key={index} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{reg.role}</Text>
                  <Text style={styles.metricValue}>{reg.count || 0}</Text>
                </View>
              ))}
            </View>

            {/* Order Statistics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Statistics</Text>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Completed Orders</Text>
                <Text style={styles.metricValue}>{analytics.orders?.completed_orders || 0}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Cancelled Orders</Text>
                <Text style={styles.metricValue}>{analytics.orders?.cancelled_orders || 0}</Text>
              </View>
              {analytics.orders?.total_orders > 0 && (
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Average Order Value</Text>
                  <Text style={styles.metricValue}>
                    {formatCurrency((analytics.gmv || 0) / analytics.orders.total_orders)}
                  </Text>
                </View>
              )}
            </View>

            {/* Top Products */}
            {analytics.popularProducts && analytics.popularProducts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Most Popular Products</Text>
                {analytics.popularProducts.slice(0, 5).map((product, index) => (
                  <View key={product.product_id || index} style={styles.metricCard}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.variety_name}</Text>
                      <Text style={styles.productType}>{product.rice_type}</Text>
                    </View>
                    <View style={styles.productStats}>
                      <Text style={styles.productRevenue}>
                        {formatCurrency(parseFloat(product.total_revenue || 0))}
                      </Text>
                      <Text style={styles.productQuantity}>
                        {parseFloat(product.total_quantity_sold || 0).toFixed(1)} kg
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Top Farmers */}
            {analytics.topFarmers && analytics.topFarmers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Performing Farmers</Text>
                {analytics.topFarmers.slice(0, 5).map((farmer, index) => (
                  <View key={farmer.farmer_id || index} style={styles.metricCard}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{farmer.farm_name || farmer.full_name}</Text>
                      <Text style={styles.productType}>{farmer.total_orders} orders</Text>
                    </View>
                    <View style={styles.productStats}>
                      <Text style={styles.productRevenue}>
                        {formatCurrency(parseFloat(farmer.total_revenue || 0))}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
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
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
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
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2d5016",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  metricCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 14,
    color: "#666",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2d5016",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productType: {
    fontSize: 12,
    color: "#666",
  },
  productStats: {
    alignItems: "flex-end",
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2d5016",
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 12,
    color: "#666",
  },
});
