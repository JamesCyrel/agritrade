import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { farmerAPI } from "../../services/api";

export default function FarmerProfileSetup() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [address, setAddress] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    // Try get current profile to prefill
    (async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) return;
        const res = await farmerAPI.getProfile(token);
        if (res?.data) {
          const p = res.data;
          setFullName(p.full_name || "");
          setFarmName(p.farm_name || "");
          setAddress(p.address || "");
          setBankAccountNumber(p.bank_account_number || "");
          setBankName(p.bank_name || "");
          setBranchCode(p.branch_code || "");
          setCoords({ lat: p.latitude || null, lon: p.longitude || null });
        }
      } catch {}
    })();
  }, []);

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
    } catch (e) {
      Alert.alert('Location Error', 'Could not get your location.');
    } finally {
      setLocLoading(false);
    }
  };

  const handleSave = async () => {
    if (!farmName || !address || !bankAccountNumber || !bankName || !branchCode) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
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
        Alert.alert('Saved', 'Profile saved. Next, upload your verification documents.', [
          { text: 'Continue', onPress: () => router.replace('/farmer/verification') }
        ]);
      } else {
        Alert.alert('Error', res.message || 'Failed to save profile');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Farmer Profile Setup</Text>
      <Text style={styles.subtitle}>Complete your profile to start verification</Text>

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
        {locLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.captureText}>Capture GPS Location</Text>}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Bank Details</Text>
      <Text style={styles.label}>Account Number</Text>
      <TextInput style={styles.input} value={bankAccountNumber} onChangeText={setBankAccountNumber} placeholder="Account Number" keyboardType="number-pad" />

      <Text style={styles.label}>Bank Name</Text>
      <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="Bank Name" />

      <Text style={styles.label}>Branch Code</Text>
      <TextInput style={styles.input} value={branchCode} onChangeText={setBranchCode} placeholder="Branch Code" />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save & Continue</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 16, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2d5016', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  captureButton: { backgroundColor: '#2d5016', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  captureText: { color: '#fff', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 20 },
  saveButton: { backgroundColor: '#2d5016', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});


