import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { adminAPI } from "../../services/api";

export default function AdminVerificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await adminAPI.listPending(token);
      setItems(res.data || []);
      setDetail(null);
      setSelected(null);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (userId) => {
    try {
      setSelected(userId);
      const token = await AsyncStorage.getItem('authToken');
      const res = await adminAPI.getApplication(token, userId);
      setDetail(res.data);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await adminAPI.approve(token, selected);
      Alert.alert('Approved', 'Farmer has been approved.');
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    if (!rejectReason) {
      Alert.alert('Missing reason', 'Please provide a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await adminAPI.reject(token, selected, rejectReason);
      Alert.alert('Rejected', 'Farmer has been rejected.');
      setRejectReason("");
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verifications</Text>
        <Text style={styles.headerSubtitle}>Review farmer applications</Text>
      </View>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#2d5016" /></View>
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Pending Applications</Text>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>No pending applications.</Text>
          ) : (
            items.map((it) => (
              <TouchableOpacity key={it.user_id} style={styles.item} onPress={() => loadDetail(it.user_id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{it.farm_name || it.full_name || 'Unnamed Farm'}</Text>
                  <Text style={styles.itemSub}>{it.email || it.phone}</Text>
                  <Text style={styles.badge}>{it.verification_status}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))
          )}

          {detail && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Application Detail</Text>
              <Text style={styles.detailText}>Farmer: {detail.profile?.full_name || '-'} </Text>
              <Text style={styles.detailText}>Farm: {detail.profile?.farm_name || '-'} </Text>
              <Text style={styles.detailText}>Address: {detail.profile?.address || '-'}</Text>
              <Text style={styles.detailText}>Bank: {detail.profile?.bank_name || '-'} ({detail.profile?.branch_code || '-'})</Text>
              <Text style={styles.detailText}>Account: {detail.profile?.bank_account_number || '-'}</Text>
              <Text style={styles.detailText}>Docs:</Text>
              {(detail.documents || []).map((d) => (
                <Text key={d.id} style={styles.docItem}>• {d.doc_type} ({new Date(d.created_at).toLocaleString()})</Text>
              ))}

              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.approve]} onPress={approve} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Approve</Text>}
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity style={[styles.actionBtn, styles.reject]} onPress={reject} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Reject</Text>}
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.reasonInput}
                placeholder="Rejection reason (required for Reject)"
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
              />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#2d5016', padding: 20, paddingTop: 50, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#e0e0e0' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  emptyText: { color: '#666' },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSub: { fontSize: 12, color: '#666', marginTop: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#fff3cd', color: '#856404', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, fontSize: 12, marginTop: 6 },
  arrow: { fontSize: 24, color: '#999', marginLeft: 8 },
  detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 12 },
  detailText: { color: '#333', marginBottom: 6 },
  docItem: { color: '#333', marginLeft: 8, marginBottom: 4 },
  actionsRow: { flexDirection: 'row', marginTop: 12 },
  actionBtn: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center' },
  approve: { backgroundColor: '#2d5016' },
  reject: { backgroundColor: '#dc3545' },
  actionText: { color: '#fff', fontWeight: '600' },
  reasonInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', marginTop: 12, minHeight: 60, textAlignVertical: 'top' },
});


