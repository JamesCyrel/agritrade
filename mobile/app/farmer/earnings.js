import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { farmerAPI } from "../../services/api";

export default function FarmerEarningsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const [ledgerRes, payoutsRes] = await Promise.all([
        farmerAPI.getLedger(token),
        farmerAPI.getPayouts(token),
      ]);
      if (ledgerRes?.success) {
        const raw = ledgerRes.data;
        const list = Array.isArray(raw) ? raw : (raw?.ledger || raw?.rows || raw?.items || []);
        setLedger(list);
        const bal = Array.isArray(raw) ? 0 : (raw?.currentBalance || 0);
        setCurrentBalance(parseFloat(bal) || 0);
      } else {
        setLedger([]);
        setCurrentBalance(0);
      }
      if (payoutsRes?.success) {
        const rawP = payoutsRes.data;
        const listP = Array.isArray(rawP) ? rawP : (rawP?.payouts || rawP?.rows || rawP?.items || []);
        setPayouts(listP);
      } else {
        setPayouts([]);
      }
    } catch (e) {
      console.error("Earnings load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatPeso = (n) => `₱${parseFloat(n || 0).toFixed(2)}`;
  const isSameWeek = (date) => {
    const d = new Date(date);
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    const weekNow = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    const weekD = Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
    return d.getFullYear() === now.getFullYear() && weekD === weekNow;
  };
  const isSameMonth = (date) => {
    const d = new Date(date);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  // Compute earnings from ledger entries (EARNING positive, COMMISSION negative, REFUND negative, PAYOUT negative)
  const stats = useMemo(() => {
    let week = 0, weekOrders = 0;
    let month = 0, monthOrders = 0;
    let total = currentBalance || 0; // use server balance for total
    let totalOrders = 0;
    (Array.isArray(ledger) ? ledger : []).forEach((entry) => {
      const amount = parseFloat(entry.amount || 0);
      const type = entry.transaction_type;
      const signed = (type === 'EARNING') ? amount : -Math.abs(amount);
      if (type === 'EARNING') totalOrders += 1;
      if (isSameWeek(entry.created_at)) {
        week += signed;
        if (type === 'EARNING') weekOrders += 1;
      }
      if (isSameMonth(entry.created_at)) {
        month += signed;
        if (type === 'EARNING') monthOrders += 1;
      }
    });
    return {
      week: { amount: week, orders: weekOrders },
      month: { amount: month, orders: monthOrders },
      total: { amount: total, orders: totalOrders },
    };
  }, [ledger]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your income</Text>
      </View>

      {loading ? (
        <View style={[styles.content, styles.center]}>
          <ActivityIndicator size="large" color="#2d5016" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatPeso(stats.week.amount)}</Text>
              <Text style={styles.statLabel}>This Week</Text>
              <Text style={styles.statOrders}>{stats.week.orders} orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatPeso(stats.month.amount)}</Text>
              <Text style={styles.statLabel}>This Month</Text>
              <Text style={styles.statOrders}>{stats.month.orders} orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatPeso(stats.total.amount)}</Text>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statOrders}>{stats.total.orders} orders</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Payouts</Text>
          {payouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No payouts yet</Text>
            </View>
          ) : (
            payouts.map((p) => (
              <View key={p.payout_id} style={styles.payoutCard}>
                <View style={styles.payoutInfo}>
                  <Text style={styles.payoutDate}>{new Date(p.payout_date || p.created_at).toLocaleDateString()}</Text>
                  <Text style={styles.payoutAmount}>{formatPeso(p.net_amount || p.total_earnings || 0)}</Text>
                </View>
                <View style={[styles.statusBadge, 
                  p.status === 'COMPLETED' ? styles.badgeSuccess : 
                  p.status === 'FAILED' ? styles.badgeDanger : styles.badgePending]}
                >
                  <Text style={styles.statusText}>{(p.status || 'PENDING').toUpperCase()}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  center: { alignItems: "center", justifyContent: "center" },
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccess: { backgroundColor: "#d4edda" },
  badgeDanger: { backgroundColor: "#f8d7da" },
  badgePending: { backgroundColor: "#fff3cd" },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#155724",
  },
  emptyState: { alignItems: "center", padding: 16 },
  emptyStateText: { color: "#666" },
});

