import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export default function AdminOrdersScreen() {
  const orders = [
    { id: "#1234", customer: "Priya S.", farmer: "Green Valley", amount: "₱850", status: "Pending" },
    { id: "#1235", customer: "Raj K.", farmer: "Organic Rice Co.", amount: "₱1,200", status: "Confirmed" },
    { id: "#1236", customer: "Anita M.", farmer: "Premium Paddy", amount: "₱950", status: "Out for Delivery" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Monitoring</Text>
        <Text style={styles.headerSubtitle}>View and track all orders</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>All Orders</Text>
        {orders.map((order, index) => (
          <TouchableOpacity key={index} style={styles.orderCard}>
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
            <Text style={styles.orderInfo}>Customer: {order.customer}</Text>
            <Text style={styles.orderInfo}>Farmer: {order.farmer}</Text>
            <Text style={styles.orderAmount}>{order.amount}</Text>
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
  orderInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2d5016",
    marginTop: 8,
  },
});

