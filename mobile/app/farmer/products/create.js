import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { productAPI } from "../../../services/api";

export default function CreateProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEdit = !!params.id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [riceType, setRiceType] = useState("MILLED");
  const [varietyName, setVarietyName] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [availableQuantity, setAvailableQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("KG");
  const [images, setImages] = useState([null]); // Array of image URIs, start with one empty slot
  const [sackSizes, setSackSizes] = useState([{ size_kg: "", price: "" }]);

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [isEdit]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await productAPI.getProduct(token, params.id);
      if (res.success && res.data) {
        const p = res.data;
        setRiceType(p.rice_type);
        setVarietyName(p.variety_name || "");
        setDescription(p.description || "");
        setPricePerKg(String(p.price_per_kg || ""));
        setAvailableQuantity(String(p.available_quantity || ""));
        setQuantityUnit(p.quantity_unit || "KG");
        // For edit mode, preserve existing image URLs
        setImages(p.images && p.images.length > 0 ? p.images : [null]);
        setSackSizes(
          p.sack_sizes && p.sack_sizes.length > 0
            ? p.sack_sizes.map((s) => ({ size_kg: String(s.size_kg), price: String(s.price) }))
            : [{ size_kg: "", price: "" }]
        );
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

  const pickImage = async (index = null) => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to select images!');
      return;
    }

    // Show action sheet for camera or gallery
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus.status !== 'granted') {
              Alert.alert('Permission needed', 'Sorry, we need camera permissions!');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              handleImageSelected(result.assets[0].uri, index);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
              allowsMultipleSelection: false,
            });

            if (!result.canceled && result.assets[0]) {
              handleImageSelected(result.assets[0].uri, index);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleImageSelected = (uri, index) => {
    if (index !== null) {
      // Replace image at index
      const newImages = [...images];
      newImages[index] = uri;
      setImages(newImages);
      } else {
        // Add new image - find first empty slot or add to end
        const emptyIndex = images.findIndex(img => img === null || img === "");
        if (emptyIndex !== -1) {
          const newImages = [...images];
          newImages[emptyIndex] = uri;
          setImages(newImages);
        } else if (images.length < 5) {
          setImages([...images, uri]);
        } else {
          Alert.alert("Limit", "Maximum 5 images allowed");
        }
      }
  };

  const removeImage = (index) => {
    const validImages = images.filter((img) => img !== null && img !== "");
    if (validImages.length > 1) {
      // Remove this image, but keep at least one slot
      const newImages = [...images];
      newImages[index] = null;
      // If we removed the last image in a slot, keep structure but ensure at least one slot exists
      setImages(newImages);
    } else {
      Alert.alert("Required", "At least 1 image is required");
    }
  };

  // Convert image URI to base64
  const uriToBase64 = async (uri) => {
    try {
      // Use expo-file-system with string encoding (v19+ API)
      // The encoding parameter accepts the string 'base64' directly
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      return base64;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      console.error('URI:', uri);
      Alert.alert('Error', 'Failed to process image. Please try selecting the image again.');
      throw error;
    }
  };

  const addSackSize = () => {
    setSackSizes([...sackSizes, { size_kg: "", price: "" }]);
  };

  const removeSackSize = (index) => {
    if (sackSizes.length > 1) {
      setSackSizes(sackSizes.filter((_, i) => i !== index));
    }
  };

  const updateSackSize = (index, field, value) => {
    const newSacks = [...sackSizes];
    newSacks[index][field] = value;
    setSackSizes(newSacks);
  };

  const validateAndSave = async () => {
    // Validation
    if (!varietyName.trim()) {
      Alert.alert("Validation Error", "Variety name is required");
      return;
    }
    if (!pricePerKg || parseFloat(pricePerKg) <= 0) {
      Alert.alert("Validation Error", "Valid price per kg is required");
      return;
    }
    if (!availableQuantity || parseFloat(availableQuantity) < 0) {
      Alert.alert("Validation Error", "Valid available quantity is required");
      return;
    }
    const validImages = images.filter((img) => img !== null && img !== "");
    if (validImages.length < 1 || validImages.length > 5) {
      Alert.alert("Validation Error", "1-5 images are required");
      return;
    }

    const validSackSizes = sackSizes
      .filter((s) => s.size_kg.trim() && s.price.trim())
      .map((s) => ({
        size_kg: parseFloat(s.size_kg),
        price: parseFloat(s.price),
      }));

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      
      // Filter out null/empty images and convert to base64 (for new images) or keep URLs (for existing in edit mode)
      const validImages = images.filter((img) => img !== null && img !== "");
      const processedImages = await Promise.all(
        validImages.map(async (img) => {
          // If it's a local URI (starts with file:// or content://), convert to base64
          if (img.startsWith('file://') || img.startsWith('content://') || img.startsWith('ph://')) {
            try {
              const base64 = await uriToBase64(img);
              return `data:image/jpeg;base64,${base64}`;
            } catch (error) {
              console.error('Error converting image:', error);
              Alert.alert('Error', 'Failed to process image. Please try again.');
              throw error;
            }
          }
          // If it's already a URL or base64 string, keep it as is
          return img;
        })
      );

      const productData = {
        rice_type: riceType,
        variety_name: varietyName.trim(),
        description: description.trim() || null,
        price_per_kg: parseFloat(pricePerKg),
        available_quantity: parseFloat(availableQuantity),
        quantity_unit: quantityUnit,
        images: processedImages,
        sack_sizes: validSackSizes,
      };

      const res = isEdit
        ? await productAPI.updateProduct(token, params.id, productData)
        : await productAPI.createProduct(token, productData);

      if (res.success) {
        Alert.alert("Success", isEdit ? "Product updated successfully" : "Product created successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to save product");
      }
    } catch (e) {
      console.error("Save product error:", e);
      Alert.alert("Error", e.message || "Failed to save product");
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{isEdit ? "Edit Product" : "Create Product Listing"}</Text>
      <Text style={styles.subtitle}>Fill in all required fields to {isEdit ? "update" : "create"} your product</Text>

      {/* Rice Type */}
      <Text style={styles.label}>Rice Type *</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={styles.radioOption}
          onPress={() => setRiceType("MILLED")}
        >
          <Text style={styles.radio}>{riceType === "MILLED" ? "●" : "○"}</Text>
          <Text style={styles.radioLabel}>Milled</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.radioOption}
          onPress={() => setRiceType("UNMILLED_PADDY")}
        >
          <Text style={styles.radio}>{riceType === "UNMILLED_PADDY" ? "●" : "○"}</Text>
          <Text style={styles.radioLabel}>Unmilled/Paddy</Text>
        </TouchableOpacity>
      </View>

      {/* Variety Name */}
      <Text style={styles.label}>Variety Name *</Text>
      <TextInput
        style={styles.input}
        value={varietyName}
        onChangeText={setVarietyName}
        placeholder="e.g., Basmati, Sona Masuri"
      />

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Detailed description of the product..."
        multiline
        numberOfLines={4}
      />

      {/* Price per kg */}
      <Text style={styles.label}>Price per Kilogram (₱) *</Text>
      <TextInput
        style={styles.input}
        value={pricePerKg}
        onChangeText={(text) => {
          // Only allow numbers and one decimal point, no negative values
          const sanitized = text.replace(/[^0-9.]/g, '');
          const parts = sanitized.split('.');
          const cleaned = parts.length > 2 
            ? parts[0] + '.' + parts.slice(1).join('')
            : sanitized;
          setPricePerKg(cleaned);
        }}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      {/* Available Quantity */}
      <Text style={styles.label}>Available Quantity *</Text>
      <View style={styles.quantityRow}>
        <TextInput
          style={[styles.input, styles.quantityInput]}
          value={availableQuantity}
          onChangeText={(text) => {
            // Only allow numbers and one decimal point, no negative values
            const sanitized = text.replace(/[^0-9.]/g, '');
            const parts = sanitized.split('.');
            const cleaned = parts.length > 2 
              ? parts[0] + '.' + parts.slice(1).join('')
              : sanitized;
            setAvailableQuantity(cleaned);
          }}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <View style={styles.unitButtons}>
          <TouchableOpacity
            style={[styles.unitButton, quantityUnit === "KG" && styles.unitButtonActive]}
            onPress={() => setQuantityUnit("KG")}
          >
            <Text style={[styles.unitButtonText, quantityUnit === "KG" && styles.unitButtonTextActive]}>KG</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, quantityUnit === "SACKS" && styles.unitButtonActive]}
            onPress={() => setQuantityUnit("SACKS")}
          >
            <Text style={[styles.unitButtonText, quantityUnit === "SACKS" && styles.unitButtonTextActive]}>SACKS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Images */}
      <Text style={styles.label}>Product Images (1-5) *</Text>
      <Text style={styles.hint}>Select images from gallery or take a photo</Text>
      {images.map((img, index) => (
        <View key={index} style={styles.imageContainer}>
          {img ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: img }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <Text style={styles.removeImageButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePlaceholder}
              onPress={() => pickImage(index)}
            >
              <Text style={styles.imagePlaceholderText}>📷</Text>
              <Text style={styles.imagePlaceholderLabel}>Tap to add image</Text>
            </TouchableOpacity>
          )}
          {img && (
            <TouchableOpacity
              style={styles.replaceImageButton}
              onPress={() => pickImage(index)}
            >
              <Text style={styles.replaceImageButtonText}>Replace</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {images.length < 5 && (
        <TouchableOpacity style={styles.addImageButton} onPress={() => pickImage()}>
          <Text style={styles.addImageButtonText}>+ Add Image</Text>
        </TouchableOpacity>
      )}

      {/* Sack Sizes */}
      <Text style={styles.label}>Sack Sizes (Optional)</Text>
      <Text style={styles.hint}>Add different sack sizes with their prices</Text>
      {sackSizes.map((sack, index) => (
        <View key={index} style={styles.sackRow}>
          <TextInput
            style={[styles.input, styles.sackInput]}
            value={sack.size_kg}
            onChangeText={(value) => updateSackSize(index, "size_kg", value)}
            placeholder="Size (kg)"
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.sackInput]}
            value={sack.price}
            onChangeText={(value) => updateSackSize(index, "price", value)}
            placeholder="Price (₱)"
            keyboardType="decimal-pad"
          />
          {sackSizes.length > 1 && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeSackSize(index)}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addItemButton} onPress={addSackSize}>
        <Text style={styles.addItemButtonText}>+ Add Sack Size</Text>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={validateAndSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{isEdit ? "Update Product" : "Create Product"}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  contentContainer: { padding: 16, paddingTop: 20 },
  loadingContainer: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#2d5016", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 12, marginBottom: 6 },
  hint: { fontSize: 12, color: "#999", marginBottom: 8, fontStyle: "italic" },
  input: { backgroundColor: "#fff", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#ddd", marginBottom: 8 },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  radioGroup: { flexDirection: "row", marginBottom: 12 },
  radioOption: { flexDirection: "row", alignItems: "center", marginRight: 20 },
  radio: { fontSize: 20, color: "#2d5016", marginRight: 8 },
  radioLabel: { fontSize: 14, color: "#333" },
  quantityRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  quantityInput: { flex: 1, marginRight: 8 },
  unitButtons: { flexDirection: "row", gap: 8 },
  unitButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" },
  unitButtonActive: { backgroundColor: "#2d5016", borderColor: "#2d5016" },
  unitButtonText: { fontSize: 14, fontWeight: "600", color: "#333" },
  unitButtonTextActive: { color: "#fff" },
  imageContainer: { marginBottom: 16 },
  imagePreviewContainer: { position: "relative", marginBottom: 8 },
  imagePreview: { width: "100%", height: 200, borderRadius: 8, backgroundColor: "#f0f0f0" },
  removeImageButton: { position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(220, 53, 69, 0.9)", alignItems: "center", justifyContent: "center" },
  removeImageButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  imagePlaceholder: { width: "100%", height: 200, borderRadius: 8, backgroundColor: "#fff", borderWidth: 2, borderColor: "#ddd", borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  imagePlaceholderText: { fontSize: 48, marginBottom: 8 },
  imagePlaceholderLabel: { fontSize: 14, color: "#666" },
  replaceImageButton: { backgroundColor: "#2d5016", borderRadius: 6, padding: 10, alignItems: "center" },
  replaceImageButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  addImageButton: { backgroundColor: "#2d5016", borderRadius: 6, padding: 12, alignItems: "center", marginBottom: 12 },
  addImageButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  sackRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  sackInput: { flex: 1, marginRight: 8 },
  removeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#dc3545", alignItems: "center", justifyContent: "center" },
  removeButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  addItemButton: { backgroundColor: "#2d5016", borderRadius: 6, padding: 10, alignItems: "center", marginBottom: 12 },
  addItemButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  saveButton: { backgroundColor: "#2d5016", borderRadius: 8, padding: 16, alignItems: "center", marginTop: 24, marginBottom: 20 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

