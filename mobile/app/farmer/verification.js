import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, TextInput, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { farmerAPI } from "../../services/api";
import { useRouter, useFocusEffect } from "expo-router";
import { CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react-native";

export default function FarmerVerification() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [reason, setReason] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Document placeholders (IDs or descriptions). Image upload can be added later.
  const [govIdNumber, setGovIdNumber] = useState("");
  const [proofOfAddress, setProofOfAddress] = useState("");

  const refreshStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await farmerAPI.getVerificationStatus(token);
      if (res.success) {
        setStatus(res.data.verification_status);
        setReason(res.data.reason || null);
      }
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      refreshStatus();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshStatus();
    setRefreshing(false);
  }, []);

  const handleSubmit = async () => {
    if (!govIdNumber || !proofOfAddress) {
      Alert.alert('Missing documents', 'Please provide the required document references.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await farmerAPI.uploadDocuments(token, [
        { doc_type: 'GOV_ID', file_data: govIdNumber },
        { doc_type: 'ADDRESS_PROOF', file_data: proofOfAddress },
      ]);
      if (res.success) {
        Alert.alert('Submitted', 'Your documents were submitted. We will notify you after review.');
        await refreshStatus();
      } else {
        Alert.alert('Error', res.message || 'Failed to submit documents');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit documents');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!status) return { icon: null, text: 'Unknown' };
    if (status === 'APPROVED') return { icon: <CheckCircle size={18} color="#2ecc71" />, text: 'Approved' };
    if (status === 'PENDING_REVIEW') return { icon: <Clock size={18} color="#f39c12" />, text: 'Pending Review' };
    if (status === 'PENDING_DOCUMENTS') return { icon: <AlertTriangle size={18} color="#e67e22" />, text: 'Documents Needed' };
    if (status === 'REJECTED') return { icon: <XCircle size={18} color="#e74c3c" />, text: 'Rejected' };
    return { icon: null, text: status };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d5016']} />}
    >
      <Text style={styles.title}>Farmer Verification</Text>
      <Text style={styles.subtitle}>Upload the required documents for verification</Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Current Status</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {statusDisplay.icon && <View style={{ marginRight: 6 }}>{statusDisplay.icon}</View>}
          <Text style={styles.statusValue}>{statusDisplay.text}</Text>
        </View>
        {reason ? <Text style={styles.reasonText}>Reason: {reason}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Required Documents</Text>
      <Text style={styles.label}>Government ID (number or reference)</Text>
      <TextInput style={styles.input} value={govIdNumber} onChangeText={setGovIdNumber} placeholder="e.g., ID Number" />

      <Text style={styles.label}>Proof of Address/Ownership (reference)</Text>
      <TextInput style={styles.input} value={proofOfAddress} onChangeText={setProofOfAddress} placeholder="e.g., Document ID" />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit for Review</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backHome} onPress={() => router.replace('/farmer/home')}>
        <Text style={styles.backHomeText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 16, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2d5016', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  statusCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2d5016' },
  statusLabel: { fontSize: 12, color: '#666' },
  statusValue: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 4 },
  reasonText: { fontSize: 12, color: '#a00', marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  submitButton: { backgroundColor: '#2d5016', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backHome: { alignItems: 'center', marginTop: 16 },
  backHomeText: { color: '#2d5016', fontWeight: '600' },
});


