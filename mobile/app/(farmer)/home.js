import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

export default function FarmerHomeScreen() {
  const router = useRouter();

  const quickStats = [
    { label: "Pending Orders", value: "3", color: "#ff9800" },
    { label: "Total Earnings", value: "₹12,450", color: "#2d5016" },
    { label: "Active Products", value: "8", color: "#2196f3" },
    { label: "Rating", value: "4.7 ⭐", color: "#ffc107" },
  ];

  const recentOrders = [
    { id: "#1234", customer: "Priya S.", amount: "₹850", status: "Pending" },
    { id: "#1235", customer: "Raj K.", amount: "₹1,200", status: "Confirmed" },
    { id: "#1236", customer: "Anita M.", amount: "₹950", status: "Out for Delivery" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Farm Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back! 👋</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            ⚠️ You have 3 new orders waiting for confirmation
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {quickStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {recentOrders.map((order, index) => (
          <TouchableOpacity
            key={index}
            style={styles.orderCard}
            onPress={() => {
              console.log(`View order ${order.id}`);
            }}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>{order.id}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      order.status === "Pending"
                        ? "#fff3cd"
                        : order.status === "Confirmed"
                        ? "#d4edda"
                        : "#cfe2ff",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        order.status === "Pending"
                          ? "#856404"
                          : order.status === "Confirmed"
                          ? "#155724"
                          : "#004085",
                    },
                  ]}
                >
                  {order.status}
                </Text>
              </View>
            </View>
            <Text style={styles.orderCustomer}>{order.customer}</Text>
            <Text style={styles.orderAmount}>{order.amount}</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                console.log(`Action for ${order.id}`);
              }}
            >
              <Text style={styles.actionButtonText}>
                {order.status === "Pending" ? "Accept Order" : "View Details"}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              console.log("Add New Product");
            }}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionCardText}>Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              console.log("View Products");
            }}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionCardText}>My Products</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              console.log("View All Orders");
            }}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionCardText}>All Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              console.log("View Earnings");
            }}
          >
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionCardText}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              console.log("View Reviews");
            }}
          >
            <Text style={styles.actionIcon}>⭐</Text>
            <Text style={styles.actionCardText}>Reviews</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              console.log("Update Profile");
            }}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionCardText}>Profile</Text>
          </TouchableOpacity>
        </View>
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
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    width: "30%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionCardText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
});

