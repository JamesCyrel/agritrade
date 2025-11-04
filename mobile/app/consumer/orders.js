import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export default function ConsumerOrdersScreen() {
  const orders = [
    { id: "#1234", farmer: "Green Valley Farm", amount: "₹850", status: "Out for Delivery", date: "Today" },
    { id: "#1235", farmer: "Organic Rice Co.", amount: "₹1,200", status: "Confirmed", date: "Yesterday" },
    { id: "#1236", farmer: "Premium Paddy", amount: "₹950", status: "Delivered", date: "2 days ago" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>Track your orders</Text>
      </View>

      <ScrollView style={styles.content}>
        {orders.map((order, index) => (
          <TouchableOpacity key={index} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.orderDate}>{order.date}</Text>
            </View>
            <Text style={styles.farmerName}>{order.farmer}</Text>
            <View style={styles.orderFooter}>
              <Text style={styles.orderAmount}>{order.amount}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      order.status === "Delivered"
                        ? "#d4edda"
                        : order.status === "Confirmed"
                        ? "#cfe2ff"
                        : "#fff3cd",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        order.status === "Delivered"
                          ? "#155724"
                          : order.status === "Confirmed"
                          ? "#004085"
                          : "#856404",
                    },
                  ]}
                >
                  {order.status}
                </Text>
              </View>
            </View>
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
  orderDate: {
    fontSize: 12,
    color: "#666",
  },
  farmerName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2d5016",
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
});

