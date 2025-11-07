import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { farmerAPI, farmerOrderAPI, productAPI, farmerReviewAPI } from "../../services/api";

export default function FarmerProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [reason, setReason] = useState(null);
  const [profile, setProfile] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  // Dashboard metrics
  const [pendingOrders, setPendingOrders] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);

  // Setup fields
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [address, setAddress] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [coords, setCoords] = useState({ lat: null, lon: null });

  // Verification fields
  const [govIdNumber, setGovIdNumber] = useState("");
  const [proofOfAddress, setProofOfAddress] = useState("");

  const handleLogout = () => {
    Alert.alert(
      "🚪 Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("authToken");
              await AsyncStorage.removeItem("userData");
              router.replace("/auth/login");
            } catch (error) {
              router.replace("/auth/login");
            }
          },
        },
      ]
    );
  };

  const load = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const [p, v, pending, prods, ledger, revs] = await Promise.all([
        farmerAPI.getProfile(token),
        farmerAPI.getVerificationStatus(token),
        farmerOrderAPI.getOrders(token, 'PENDING'),
        productAPI.getProducts(token, false),
        farmerAPI.getLedger(token),
        farmerReviewAPI.getReviews(token, 1, 0),
      ]);
      const prof = p?.data || {};
      setProfile(prof);
      setFullName(prof.full_name || "");
      setFarmName(prof.farm_name || "");
      setAddress(prof.address || "");
      setBankAccountNumber(prof.bank_account_number || "");
      setBankName(prof.bank_name || "");
      setBranchCode(prof.branch_code || "");
      setCoords({ lat: prof.latitude || null, lon: prof.longitude || null });

      setStatus(v?.data?.verification_status || null);
      setReason(v?.data?.reason || null);
      setPendingOrders((pending?.data || []).length || 0);
      setProductCount((prods?.data || []).filter(p => p.status === 'ACTIVE').length || 0);
      if (ledger?.success) {
        const raw = ledger.data;
        setCurrentBalance(parseFloat(Array.isArray(raw) ? 0 : (raw?.currentBalance || 0)) || 0);
      }
      const revList = revs?.data?.reviews || revs?.data || [];
      setReviewsCount(revList.length || 0);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    if (!farmName || !address || !bankAccountNumber || !bankName || !branchCode) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await farmerAPI.updateProfile(token, {
        full_name: fullName,
        farm_name: farmName,
        address,
        bank_account_number: bankAccountNumber,
        bank_name: bankName,
        branch_code: branchCode,
        latitude: coords.lat,
        longitude: coords.lon,
      });
      if (res.success) {
        Alert.alert('Saved', 'Profile saved.');
        await load();
      } else {
        Alert.alert('Error', res.message || 'Failed to save profile');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const submitDocs = async () => {
    if (!govIdNumber || !proofOfAddress) {
      Alert.alert('Missing documents', 'Please provide the required documents.');
      return;
    }
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await farmerAPI.uploadDocuments(token, [
        { doc_type: 'GOV_ID', file_data: govIdNumber },
        { doc_type: 'ADDRESS_PROOF', file_data: proofOfAddress },
      ]);
      if (res.success) {
        Alert.alert('Submitted', 'Documents submitted for review.');
        await load();
      } else {
        Alert.alert('Error', res.message || 'Failed to submit');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const captureLocation = async () => {
    try {
      setLocLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to capture farm location.');
        setLocLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setCoords({ lat: location.coords.latitude, lon: location.coords.longitude });
      Alert.alert('Success', 'Location captured successfully!');
    } catch (e) {
      Alert.alert('Location Error', 'Could not get your location.');
    } finally {
      setLocLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitleInline}>My Profile</Text>
      <Text style={styles.headerSubtitleInline}>Manage your farm account</Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Verification Status</Text>
        <Text style={styles.statusValue}>
          {status === 'APPROVED' ? 'Approved ✅' :
           status === 'PENDING_REVIEW' ? 'Pending Review ⏳' :
           status === 'PENDING_DOCUMENTS' ? 'Documents Needed ⚠️' :
           status === 'REJECTED' ? 'Rejected ❌' : 'Unknown'}
        </Text>
        {reason ? <Text style={styles.reasonText}>Reason: {reason}</Text> : null}
      </View>

      {status === 'PENDING_DOCUMENTS' && (
        <View>
          <Text style={styles.sectionTitle}>Complete Profile</Text>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your full name" />
          <Text style={styles.label}>Farm Name</Text>
          <TextInput style={styles.input} value={farmName} onChangeText={setFarmName} placeholder="e.g., Green Valley Farm" />
          <Text style={styles.label}>Operational Address</Text>
          <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress} placeholder="Full address" multiline numberOfLines={3} />
          <Text style={styles.label}>Account Number</Text>
          <TextInput style={styles.input} value={bankAccountNumber} onChangeText={setBankAccountNumber} placeholder="Account Number" keyboardType="number-pad" />
          <Text style={styles.label}>Bank Name</Text>
          <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="Bank Name" />
          <Text style={styles.label}>Branch Code</Text>
          <TextInput style={styles.input} value={branchCode} onChangeText={setBranchCode} placeholder="Branch Code" />
          <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Profile</Text>}
          </TouchableOpacity>
        </View>
      )}

      {status && status !== 'APPROVED' && status !== 'PENDING_DOCUMENTS' && (
        <View>
          <Text style={styles.sectionTitle}>Verification</Text>
          <Text style={styles.label}>Government ID (number or reference)</Text>
          <TextInput style={styles.input} value={govIdNumber} onChangeText={setGovIdNumber} placeholder="e.g., ID Number" />
          <Text style={styles.label}>Proof of Address/Ownership (reference)</Text>
          <TextInput style={styles.input} value={proofOfAddress} onChangeText={setProofOfAddress} placeholder="e.g., Document ID" />
          <TouchableOpacity style={styles.saveButton} onPress={submitDocs} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Submit for Review</Text>}
          </TouchableOpacity>
        </View>
      )}

      {status === 'APPROVED' && (
        <View>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}><Text style={styles.avatar}>🌾</Text></View>
            <Text style={styles.name}>{profile.farm_name || 'Farm Name'}</Text>
            <Text style={styles.email}>{profile.full_name || ''}</Text>
            <Text style={styles.role}>Farmer</Text>
          </View>
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/farmer/products')}>
              <Text style={styles.menuIcon}>📦</Text>
              <Text style={styles.menuTitle}>My Products</Text>
              <Text style={styles.menuMeta}>{productCount}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/farmer/orders')}>
              <Text style={styles.menuIcon}>📋</Text>
              <Text style={styles.menuTitle}>My Orders</Text>
              <Text style={styles.menuMeta}>{pendingOrders} pending</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/farmer/earnings')}>
              <Text style={styles.menuIcon}>💰</Text>
              <Text style={styles.menuTitle}>Earnings</Text>
              <Text style={styles.menuMeta}>₱{currentBalance.toFixed(2)}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/farmer/reviews')}>
              <Text style={styles.menuIcon}>⭐</Text>
              <Text style={styles.menuTitle}>Reviews</Text>
              <Text style={styles.menuMeta}>{reviewsCount}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowProfileSetup(!showProfileSetup)}>
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={styles.menuTitle}>Profile Setup</Text>
              <Text style={styles.menuMeta}>{showProfileSetup ? '▼' : '▶'}</Text>
            </TouchableOpacity>
          </View>

          {showProfileSetup && (
            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your full name" />
              
              <Text style={styles.label}>Farm Name</Text>
              <TextInput style={styles.input} value={farmName} onChangeText={setFarmName} placeholder="e.g., Green Valley Farm" />
              
              <Text style={styles.label}>Operational Address</Text>
              <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress} placeholder="Full address" multiline numberOfLines={3} />
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Latitude</Text>
                  <TextInput style={styles.input} value={coords.lat ? String(coords.lat) : ""} editable={false} placeholder="Tap capture" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Longitude</Text>
                  <TextInput style={styles.input} value={coords.lon ? String(coords.lon) : ""} editable={false} placeholder="Tap capture" />
                </View>
              </View>
              
              <TouchableOpacity style={styles.captureButton} onPress={captureLocation} disabled={locLoading}>
                {locLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.captureText}>📍 Capture GPS Location</Text>}
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Bank Details</Text>
              
              <Text style={styles.label}>Account Number</Text>
              <TextInput style={styles.input} value={bankAccountNumber} onChangeText={setBankAccountNumber} placeholder="Account Number" keyboardType="number-pad" />
              
              <Text style={styles.label}>Bank Name</Text>
              <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="Bank Name" />
              
              <Text style={styles.label}>Branch Code</Text>
              <TextInput style={styles.input} value={branchCode} onChangeText={setBranchCode} placeholder="Branch Code" />
              
              <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>💾 Save Profile</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  contentContainer: { padding: 16, paddingTop: 20 },
  headerTitleInline: { fontSize: 24, fontWeight: "bold", color: "#2d5016", marginBottom: 4 },
  headerSubtitleInline: { fontSize: 14, color: "#666", marginBottom: 12 },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  avatar: { fontSize: 40 },
  name: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 4 },
  email: { fontSize: 14, color: "#666", marginBottom: 8 },
  role: { fontSize: 12, color: "#2d5016", fontWeight: "600", backgroundColor: "#e8f5e9", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  statusCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2d5016' },
  statusLabel: { fontSize: 12, color: '#666' },
  statusValue: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 4 },
  reasonText: { fontSize: 12, color: '#a00', marginTop: 6 },
  menuSection: { marginBottom: 24 },
  menuItem: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  menuIcon: { fontSize: 24, marginRight: 16 },
  menuTitle: { flex: 1, fontSize: 16, fontWeight: "500", color: "#333" },
  menuArrow: { fontSize: 24, color: "#999" },
  logoutButton: { backgroundColor: "#dc3545", borderRadius: 8, padding: 16, alignItems: "center", marginBottom: 20 },
  logoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#2d5016', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  menuMeta: { fontSize: 14, color: '#666', marginRight: 8 },
  setupSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, marginTop: -12 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  captureButton: { backgroundColor: '#2d5016', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  captureText: { color: '#fff', fontWeight: '600' },
});

