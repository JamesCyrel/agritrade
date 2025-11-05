import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";

export default function FarmerEarningsScreen() {
  const earnings = [
    { period: "This Week", amount: "₱12,450", orders: 15 },
    { period: "This Month", amount: "₱45,680", orders: 58 },
    { period: "Total", amount: "₱2,34,500", orders: 312 },
  ];

  const recentPayouts = [
    { date: "15 Jan 2024", amount: "₱12,450", status: "Completed" },
    { date: "8 Jan 2024", amount: "₱10,200", status: "Completed" },
    { date: "1 Jan 2024", amount: "₱8,900", status: "Completed" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your income</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsGrid}>
          {earnings.map((earning, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statValue}>{earning.amount}</Text>
              <Text style={styles.statLabel}>{earning.period}</Text>
              <Text style={styles.statOrders}>{earning.orders} orders</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Payouts</Text>
        {recentPayouts.map((payout, index) => (
          <View key={index} style={styles.payoutCard}>
            <View style={styles.payoutInfo}>
              <Text style={styles.payoutDate}>{payout.date}</Text>
              <Text style={styles.payoutAmount}>{payout.amount}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{payout.status}</Text>
            </View>
          </View>
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
  statsGrid: {
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2d5016",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  statOrders: {
    fontSize: 12,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  payoutCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2d5016",
  },
  statusBadge: {
    backgroundColor: "#d4edda",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#155724",
  },
});

