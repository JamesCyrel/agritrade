import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../services/api";

export default function ConsumerProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [saving, setSaving] = useState(false);

  // Profile edit
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState("");

  // Address modal
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    full_address: "",
    city: "",
    state: "",
    postal_code: "",
    is_default: false,
  });

  // Payment method modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_type: "CARD",
    card_number_last4: "",
    card_holder_name: "",
    expiry_month: "",
    expiry_year: "",
    upi_id: "",
    wallet_provider: "",
    is_default: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const [pRes, aRes, pmRes] = await Promise.all([
        consumerAPI.getProfile(token),
        consumerAPI.getAddresses(token),
        consumerAPI.getPaymentMethods(token),
      ]);

      if (pRes.success) {
        setProfile(pRes.data || {});
        setFullName(pRes.data?.full_name || "");
      }
      if (aRes.success) setAddresses(aRes.data || []);
      if (pmRes.success) setPaymentMethods(pmRes.data || []);
    } catch (e) {
      console.error("Load error:", e);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Full name cannot be empty");
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await consumerAPI.updateProfile(token, { full_name: fullName });
      if (res.success) {
        setProfile({ ...profile, full_name: fullName });
        setEditingName(false);
        Alert.alert("Success", "Profile updated");
      } else {
        Alert.alert("Error", res.message || "Failed to update profile");
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const openAddressModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        label: address.label || "",
        full_address: address.full_address || "",
        city: address.city || "",
        state: address.state || "",
        postal_code: address.postal_code || "",
        is_default: address.is_default || false,
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        label: "",
        full_address: "",
        city: "",
        state: "",
        postal_code: "",
        is_default: false,
      });
    }
    setAddressModalVisible(true);
  };

  const saveAddress = async () => {
    if (!addressForm.full_address.trim()) {
      Alert.alert("Error", "Full address is required");
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = editingAddress
        ? await consumerAPI.updateAddress(token, editingAddress.address_id, addressForm)
        : await consumerAPI.addAddress(token, addressForm);
      if (res.success) {
        setAddressModalVisible(false);
        await loadData();
        Alert.alert("Success", editingAddress ? "Address updated" : "Address added");
      } else {
        Alert.alert("Error", res.message || "Failed to save address");
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = (addressId) => {
    Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('authToken');
            const res = await consumerAPI.deleteAddress(token, addressId);
            if (res.success) {
              await loadData();
              Alert.alert("Success", "Address deleted");
            } else {
              Alert.alert("Error", res.message || "Failed to delete address");
            }
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to delete address");
          }
        },
      },
    ]);
  };

  const openPaymentModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentForm({
        payment_type: payment.payment_type || "CARD",
        card_number_last4: payment.card_number_last4 || "",
        card_holder_name: payment.card_holder_name || "",
        expiry_month: payment.expiry_month ? String(payment.expiry_month) : "",
        expiry_year: payment.expiry_year ? String(payment.expiry_year) : "",
        upi_id: payment.upi_id || "",
        wallet_provider: payment.wallet_provider || "",
        is_default: payment.is_default || false,
      });
    } else {
      setEditingPayment(null);
      setPaymentForm({
        payment_type: "CARD",
        card_number_last4: "",
        card_holder_name: "",
        expiry_month: "",
        expiry_year: "",
        upi_id: "",
        wallet_provider: "",
        is_default: false,
      });
    }
    setPaymentModalVisible(true);
  };

  const savePaymentMethod = async () => {
    if (!paymentForm.payment_type) {
      Alert.alert("Error", "Payment type is required");
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const formData = {
        ...paymentForm,
        expiry_month: paymentForm.expiry_month ? parseInt(paymentForm.expiry_month) : null,
        expiry_year: paymentForm.expiry_year ? parseInt(paymentForm.expiry_year) : null,
      };
      const res = editingPayment
        ? await consumerAPI.updatePaymentMethod(token, editingPayment.payment_id, formData)
        : await consumerAPI.addPaymentMethod(token, formData);
      if (res.success) {
        setPaymentModalVisible(false);
        await loadData();
        Alert.alert("Success", editingPayment ? "Payment method updated" : "Payment method added");
      } else {
        Alert.alert("Error", res.message || "Failed to save payment method");
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  const deletePaymentMethod = (paymentId) => {
    Alert.alert("Delete Payment Method", "Are you sure you want to delete this payment method?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('authToken');
            const res = await consumerAPI.deletePaymentMethod(token, paymentId);
            if (res.success) {
              await loadData();
              Alert.alert("Success", "Payment method deleted");
            } else {
              Alert.alert("Error", res.message || "Failed to delete payment method");
            }
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to delete payment method");
          }
        },
      },
    ]);
  };

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

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>My Profile</Text>
      <Text style={styles.headerSubtitle}>Manage your account</Text>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>👤</Text>
        </View>
        {editingName ? (
          <View style={styles.nameEditContainer}>
            <TextInput
              style={styles.nameInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full Name"
              autoFocus
            />
            <View style={styles.nameEditButtons}>
              <TouchableOpacity onPress={handleSaveName} disabled={saving} style={styles.saveButtonSmall}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonTextSmall}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditingName(false); setFullName(profile.full_name || ""); }} style={styles.cancelButtonSmall}>
                <Text style={styles.cancelButtonTextSmall}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{profile.full_name || "Consumer Name"}</Text>
            <TouchableOpacity onPress={() => setEditingName(true)} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Name</Text>
            </TouchableOpacity>
          </>
        )}
        <Text style={styles.email}>{profile.email || "consumer@example.com"}</Text>
        <Text style={styles.role}>Consumer</Text>
      </View>

      {/* Addresses Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📍 Delivery Addresses</Text>
          <TouchableOpacity onPress={() => openAddressModal()} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {addresses.length === 0 ? (
          <Text style={styles.emptyText}>No addresses saved</Text>
        ) : (
          addresses.map((addr) => (
            <View key={addr.address_id} style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressLabel}>{addr.label || "Address"}</Text>
                {addr.is_default && <Text style={styles.defaultBadge}>Default</Text>}
              </View>
              <Text style={styles.addressText}>{addr.full_address}</Text>
              {(addr.city || addr.state || addr.postal_code) && (
                <Text style={styles.addressDetails}>
                  {[addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ")}
                </Text>
              )}
              <View style={styles.addressActions}>
                <TouchableOpacity onPress={() => openAddressModal(addr)} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteAddress(addr.address_id)} style={[styles.actionButton, styles.deleteButton]}>
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Payment Methods Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💳 Payment Methods</Text>
          <TouchableOpacity onPress={() => openPaymentModal()} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {paymentMethods.length === 0 ? (
          <Text style={styles.emptyText}>No payment methods saved</Text>
        ) : (
          paymentMethods.map((pm) => (
            <View key={pm.payment_id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentType}>{pm.payment_type}</Text>
                {pm.is_default && <Text style={styles.defaultBadge}>Default</Text>}
              </View>
              {pm.payment_type === "CARD" && (
                <>
                  <Text style={styles.paymentDetails}>****{pm.card_number_last4}</Text>
                  {pm.card_holder_name && <Text style={styles.paymentDetails}>{pm.card_holder_name}</Text>}
                  {pm.expiry_month && pm.expiry_year && (
                    <Text style={styles.paymentDetails}>Exp: {pm.expiry_month}/{pm.expiry_year}</Text>
                  )}
                </>
              )}
              {pm.payment_type === "UPI" && pm.upi_id && (
                <Text style={styles.paymentDetails}>{pm.upi_id}</Text>
              )}
              {pm.payment_type === "WALLET" && (
                <>
                  <Text style={styles.paymentDetails}>{pm.wallet_provider || "Wallet"}</Text>
                </>
              )}
              <View style={styles.addressActions}>
                <TouchableOpacity onPress={() => openPaymentModal(pm)} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deletePaymentMethod(pm.payment_id)} style={[styles.actionButton, styles.deleteButton]}>
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Address Modal */}
      <Modal visible={addressModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingAddress ? "Edit Address" : "Add Address"}</Text>
            <ScrollView>
              <Text style={styles.label}>Label (e.g., Home, Work)</Text>
              <TextInput style={styles.input} value={addressForm.label} onChangeText={(t) => setAddressForm({ ...addressForm, label: t })} placeholder="Home" />
              <Text style={styles.label}>Full Address *</Text>
              <TextInput style={[styles.input, styles.multiline]} value={addressForm.full_address} onChangeText={(t) => setAddressForm({ ...addressForm, full_address: t })} placeholder="Street address" multiline numberOfLines={3} />
              <Text style={styles.label}>City</Text>
              <TextInput style={styles.input} value={addressForm.city} onChangeText={(t) => setAddressForm({ ...addressForm, city: t })} placeholder="City" />
              <Text style={styles.label}>State</Text>
              <TextInput style={styles.input} value={addressForm.state} onChangeText={(t) => setAddressForm({ ...addressForm, state: t })} placeholder="State" />
              <Text style={styles.label}>Postal Code</Text>
              <TextInput style={styles.input} value={addressForm.postal_code} onChangeText={(t) => setAddressForm({ ...addressForm, postal_code: t })} placeholder="Postal Code" keyboardType="number-pad" />
              <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAddressForm({ ...addressForm, is_default: !addressForm.is_default })}>
                <Text style={styles.checkbox}>{addressForm.is_default ? "✓" : ""}</Text>
                <Text style={styles.checkboxLabel}>Set as default address</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveAddress} disabled={saving} style={styles.saveButton}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Method Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingPayment ? "Edit Payment Method" : "Add Payment Method"}</Text>
            <ScrollView>
              <Text style={styles.label}>Payment Type *</Text>
              <View style={styles.radioGroup}>
                {["CARD", "UPI", "WALLET"].map((type) => (
                  <TouchableOpacity key={type} style={styles.radioOption} onPress={() => setPaymentForm({ ...paymentForm, payment_type: type })}>
                    <Text style={styles.radio}>{paymentForm.payment_type === type ? "●" : "○"}</Text>
                    <Text style={styles.radioLabel}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {paymentForm.payment_type === "CARD" && (
                <>
                  <Text style={styles.label}>Card Number (Last 4 digits)</Text>
                  <TextInput style={styles.input} value={paymentForm.card_number_last4} onChangeText={(t) => setPaymentForm({ ...paymentForm, card_number_last4: t })} placeholder="1234" maxLength={4} keyboardType="number-pad" />
                  <Text style={styles.label}>Card Holder Name</Text>
                  <TextInput style={styles.input} value={paymentForm.card_holder_name} onChangeText={(t) => setPaymentForm({ ...paymentForm, card_holder_name: t })} placeholder="John Doe" />
                  <Text style={styles.label}>Expiry Month</Text>
                  <TextInput style={styles.input} value={paymentForm.expiry_month} onChangeText={(t) => setPaymentForm({ ...paymentForm, expiry_month: t })} placeholder="12" keyboardType="number-pad" maxLength={2} />
                  <Text style={styles.label}>Expiry Year</Text>
                  <TextInput style={styles.input} value={paymentForm.expiry_year} onChangeText={(t) => setPaymentForm({ ...paymentForm, expiry_year: t })} placeholder="2025" keyboardType="number-pad" maxLength={4} />
                </>
              )}

              {paymentForm.payment_type === "UPI" && (
                <>
                  <Text style={styles.label}>UPI ID</Text>
                  <TextInput style={styles.input} value={paymentForm.upi_id} onChangeText={(t) => setPaymentForm({ ...paymentForm, upi_id: t })} placeholder="user@upi" />
                </>
              )}

              {paymentForm.payment_type === "WALLET" && (
                <>
                  <Text style={styles.label}>Wallet Provider</Text>
                  <TextInput style={styles.input} value={paymentForm.wallet_provider} onChangeText={(t) => setPaymentForm({ ...paymentForm, wallet_provider: t })} placeholder="PayTM, PhonePe, etc." />
                </>
              )}

              <TouchableOpacity style={styles.checkboxContainer} onPress={() => setPaymentForm({ ...paymentForm, is_default: !paymentForm.is_default })}>
                <Text style={styles.checkbox}>{paymentForm.is_default ? "✓" : ""}</Text>
                <Text style={styles.checkboxLabel}>Set as default payment method</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={savePaymentMethod} disabled={saving} style={styles.saveButton}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  contentContainer: { padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#2d5016", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  profileCard: { backgroundColor: "#fff", borderRadius: 12, padding: 24, alignItems: "center", marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  avatar: { fontSize: 40 },
  name: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 8 },
  email: { fontSize: 14, color: "#666", marginBottom: 8 },
  role: { fontSize: 12, color: "#2d5016", fontWeight: "600", backgroundColor: "#e8f5e9", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  editButton: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: "#2d5016", borderRadius: 6 },
  editButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  nameEditContainer: { width: "100%", marginBottom: 8 },
  nameInput: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#ddd", marginBottom: 8 },
  nameEditButtons: { flexDirection: "row", gap: 8 },
  saveButtonSmall: { flex: 1, backgroundColor: "#2d5016", borderRadius: 6, padding: 8, alignItems: "center" },
  saveButtonTextSmall: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cancelButtonSmall: { flex: 1, backgroundColor: "#ccc", borderRadius: 6, padding: 8, alignItems: "center" },
  cancelButtonTextSmall: { color: "#333", fontSize: 12, fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  addButton: { backgroundColor: "#2d5016", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  emptyText: { color: "#999", fontStyle: "italic", textAlign: "center", padding: 20 },
  addressCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  addressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  addressLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
  defaultBadge: { backgroundColor: "#d4edda", color: "#155724", fontSize: 10, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  addressText: { fontSize: 14, color: "#666", marginBottom: 4 },
  addressDetails: { fontSize: 12, color: "#999", marginBottom: 12 },
  addressActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionButton: { flex: 1, backgroundColor: "#2d5016", borderRadius: 6, padding: 8, alignItems: "center" },
  actionButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  deleteButton: { backgroundColor: "#dc3545" },
  deleteButtonText: { color: "#fff" },
  paymentCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  paymentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  paymentType: { fontSize: 16, fontWeight: "600", color: "#333" },
  paymentDetails: { fontSize: 14, color: "#666", marginBottom: 4 },
  logoutButton: { backgroundColor: "#dc3545", borderRadius: 8, padding: 16, alignItems: "center", marginBottom: 20 },
  logoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#2d5016", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#ddd", marginBottom: 8 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 8 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: "#2d5016", borderRadius: 4, marginRight: 8, textAlign: "center", lineHeight: 20, color: "#2d5016", fontWeight: "bold" },
  checkboxLabel: { fontSize: 14, color: "#333" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, backgroundColor: "#ccc", borderRadius: 8, padding: 14, alignItems: "center" },
  cancelButtonText: { color: "#333", fontSize: 16, fontWeight: "600" },
  saveButton: { flex: 1, backgroundColor: "#2d5016", borderRadius: 8, padding: 14, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  radioGroup: { flexDirection: "row", marginBottom: 12 },
  radioOption: { flexDirection: "row", alignItems: "center", marginRight: 20 },
  radio: { fontSize: 20, color: "#2d5016", marginRight: 8 },
  radioLabel: { fontSize: 14, color: "#333" },
});
