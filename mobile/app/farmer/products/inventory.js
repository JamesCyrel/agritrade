import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { productAPI } from "../../../services/api";

export default function InventoryUpdateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await productAPI.getProduct(token, params.id);
      if (res.success && res.data) {
        setProduct(res.data);
        setQuantity(String(res.data.available_quantity || ""));
      } else {
        Alert.alert("Error", "Failed to load product");
        router.back();
      }
    } catch (e) {
      console.error("Load product error:", e);
      Alert.alert("Error", e.message || "Failed to load product");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!quantity || parseFloat(quantity) < 0) {
      Alert.alert("Validation Error", "Valid quantity is required");
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await productAPI.updateInventory(token, params.id, parseFloat(quantity));
      if (res.success) {
        Alert.alert("Success", "Inventory updated successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to update inventory");
      }
    } catch (e) {
      console.error("Update inventory error:", e);
      Alert.alert("Error", e.message || "Failed to update inventory");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Inventory</Text>
        <Text style={styles.subtitle}>{product.variety_name}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Current Quantity</Text>
          <Text style={styles.infoValue}>
            {product.available_quantity} {product.quantity_unit}
          </Text>
        </View>

        <Text style={styles.label}>New Available Quantity *</Text>
        <View style={styles.quantityRow}>
          <TextInput
            style={[styles.input, styles.quantityInput]}
            value={quantity}
            onChangeText={(text) => {
              // Only allow numbers and one decimal point, no negative values
              const sanitized = text.replace(/[^0-9.]/g, '');
              const parts = sanitized.split('.');
              const cleaned = parts.length > 2 
                ? parts[0] + '.' + parts.slice(1).join('')
                : sanitized;
              setQuantity(cleaned);
            }}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          <View style={styles.unitBadge}>
            <Text style={styles.unitText}>{product.quantity_unit}</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Enter the total available quantity for this product. The system will automatically decrement this when orders are confirmed.
        </Text>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Update Inventory</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { alignItems: "center", justifyContent: "center" },
  header: { backgroundColor: "#2d5016", padding: 20, paddingTop: 50, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#e0e0e0" },
  content: { padding: 16, flex: 1 },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 24, alignItems: "center" },
  infoLabel: { fontSize: 12, color: "#666", marginBottom: 8 },
  infoValue: { fontSize: 24, fontWeight: "bold", color: "#2d5016" },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: { backgroundColor: "#fff", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#ddd" },
  quantityRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  quantityInput: { flex: 1, marginRight: 8 },
  unitBadge: { backgroundColor: "#2d5016", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  unitText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  hint: { fontSize: 12, color: "#666", marginBottom: 24, fontStyle: "italic" },
  saveButton: { backgroundColor: "#2d5016", borderRadius: 8, padding: 16, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

