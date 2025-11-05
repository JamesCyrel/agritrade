import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../services/api";

const CHECKOUT_STEPS = {
  ADDRESS: 1,
  SUMMARY: 2,
  PAYMENT: 3,
  CONFIRMATION: 4,
};

export default function CheckoutScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(CHECKOUT_STEPS.ADDRESS);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  // Data
  const [cartData, setCartData] = useState({ items: [], subtotal: 0 });
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Selected options
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      
      // Load cart, addresses, and payment methods in parallel
      const [cartRes, addressesRes, paymentRes] = await Promise.all([
        consumerAPI.getCart(token),
        consumerAPI.getAddresses(token),
        consumerAPI.getPaymentMethods(token),
      ]);

      if (cartRes.success) {
        setCartData(cartRes.data || { items: [], subtotal: 0 });
      }
      if (addressesRes.success) {
        const addrs = addressesRes.data || [];
        setAddresses(addrs);
        // Auto-select default address
        const defaultAddr = addrs.find((a) => a.is_default);
        if (defaultAddr) setSelectedAddressId(defaultAddr.address_id);
      }
      if (paymentRes.success) {
        const methods = paymentRes.data || [];
        setPaymentMethods(methods);
        // Auto-select default payment method
        const defaultMethod = methods.find((m) => m.is_default);
        if (defaultMethod) setSelectedPaymentId(defaultMethod.payment_id);
      }

      if (cartRes.data?.items?.length === 0) {
        Alert.alert("Empty Cart", "Your cart is empty", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Load checkout data error:", error);
      Alert.alert("Error", "Failed to load checkout data");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      Alert.alert("Error", "Please enter a promo code");
      return;
    }

    try {
      setPromoLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.validatePromoCode(token, promoCode.trim().toUpperCase(), cartData.subtotal);
      if (res.success) {
        setAppliedPromo(res.data);
        Alert.alert("Success", `Promo code applied! Discount: ₱${res.data.discount_amount.toFixed(2)}`);
      } else {
        Alert.alert("Error", res.message || "Invalid promo code");
        setAppliedPromo(null);
      }
    } catch (error) {
      console.error("Apply promo error:", error);
      Alert.alert("Error", "Failed to validate promo code");
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert("Error", "Please select a delivery address");
      return;
    }
    if (!selectedPaymentId) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    try {
      setPlacingOrder(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.createOrder(token, {
        deliveryAddressId: selectedAddressId,
        paymentMethodId: selectedPaymentId,
        promoCode: appliedPromo?.code || null,
        notes: notes.trim() || null,
      });

      if (res.success) {
        setCurrentStep(CHECKOUT_STEPS.CONFIRMATION);
        // After 2 seconds, navigate to orders
        setTimeout(() => {
          router.replace("/consumer/orders");
        }, 2000);
      } else {
        Alert.alert("Error", res.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Place order error:", error);
      Alert.alert("Error", "Failed to place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  const deliveryFee = 50;
  const discountAmount = appliedPromo?.discount_amount || 0;
  const subtotalAfterDiscount = cartData.subtotal - discountAmount;
  const tax = subtotalAfterDiscount * 0.12;
  const total = subtotalAfterDiscount + deliveryFee + tax;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  if (currentStep === CHECKOUT_STEPS.CONFIRMATION) {
    return (
      <View style={[styles.container, styles.confirmationContainer]}>
        <Text style={styles.confirmationIcon}>✅</Text>
        <Text style={styles.confirmationTitle}>Order Placed Successfully!</Text>
        <Text style={styles.confirmationText}>Your order has been confirmed</Text>
        <Text style={styles.confirmationSubtext}>Redirecting to orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, currentStep >= CHECKOUT_STEPS.ADDRESS && styles.stepDotActive]} />
          <View style={[styles.stepLine, currentStep > CHECKOUT_STEPS.ADDRESS && styles.stepLineActive]} />
          <View style={[styles.stepDot, currentStep >= CHECKOUT_STEPS.SUMMARY && styles.stepDotActive]} />
          <View style={[styles.stepLine, currentStep > CHECKOUT_STEPS.SUMMARY && styles.stepLineActive]} />
          <View style={[styles.stepDot, currentStep >= CHECKOUT_STEPS.PAYMENT && styles.stepDotActive]} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Step 1: Address Selection */}
        {currentStep === CHECKOUT_STEPS.ADDRESS && (
          <View>
            <Text style={styles.stepTitle}>Select Delivery Address</Text>
            {addresses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No addresses saved</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push("/consumer/profile")}
                >
                  <Text style={styles.addButtonText}>Add Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              addresses.map((address) => (
                <TouchableOpacity
                  key={address.address_id}
                  style={[
                    styles.addressCard,
                    selectedAddressId === address.address_id && styles.addressCardActive,
                  ]}
                  onPress={() => setSelectedAddressId(address.address_id)}
                >
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressLabel}>{address.label || "Address"}</Text>
                    {address.is_default && (
                      <Text style={styles.defaultBadge}>Default</Text>
                    )}
                  </View>
                  <Text style={styles.addressText}>{address.full_address}</Text>
                  {(address.city || address.state) && (
                    <Text style={styles.addressLocation}>
                      {address.city} {address.state && `, ${address.state}`}
                    </Text>
                  )}
                  {address.postal_code && (
                    <Text style={styles.addressPostal}>{address.postal_code}</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Step 2: Order Summary */}
        {currentStep === CHECKOUT_STEPS.SUMMARY && (
          <View>
            <Text style={styles.stepTitle}>Order Summary</Text>
            
            {/* Cart Items */}
            {cartData.items.map((item) => (
              <View key={item.cart_item_id} style={styles.summaryItem}>
                <Text style={styles.summaryItemName}>{item.variety_name}</Text>
                <Text style={styles.summaryItemDetails}>
                  {item.quantity} {item.sack_size_kg ? `× ${item.sack_size_kg}kg sacks` : "kg"} @ ₱{item.unit_price}
                </Text>
                <Text style={styles.summaryItemTotal}>₱{item.item_total.toFixed(2)}</Text>
              </View>
            ))}

            {/* Promo Code */}
            <View style={styles.promoSection}>
              <Text style={styles.promoLabel}>Promo Code</Text>
              <View style={styles.promoInputRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChangeText={setPromoCode}
                  editable={!appliedPromo}
                />
                {appliedPromo ? (
                  <TouchableOpacity
                    style={styles.promoRemoveButton}
                    onPress={() => {
                      setAppliedPromo(null);
                      setPromoCode("");
                    }}
                  >
                    <Text style={styles.promoRemoveButtonText}>Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.promoApplyButton}
                    onPress={handleApplyPromo}
                    disabled={promoLoading}
                  >
                    {promoLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.promoApplyButtonText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {appliedPromo && (
                <Text style={styles.promoAppliedText}>
                  ✓ {appliedPromo.code} applied - ₱{appliedPromo.discount_amount.toFixed(2)} discount
                </Text>
              )}
            </View>

            {/* Price Breakdown */}
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>₱{cartData.subtotal.toFixed(2)}</Text>
              </View>
              {appliedPromo && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Discount</Text>
                  <Text style={[styles.priceValue, styles.discountValue]}>
                    -₱{discountAmount.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Delivery Fee</Text>
                <Text style={styles.priceValue}>₱{deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tax (12%)</Text>
                <Text style={styles.priceValue}>₱{tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Delivery Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Special instructions for delivery..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        )}

        {/* Step 3: Payment Selection */}
        {currentStep === CHECKOUT_STEPS.PAYMENT && (
          <View>
            <Text style={styles.stepTitle}>Select Payment Method</Text>
            {paymentMethods.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No payment methods saved</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push("/consumer/profile")}
                >
                  <Text style={styles.addButtonText}>Add Payment Method</Text>
                </TouchableOpacity>
              </View>
            ) : (
              paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.payment_id}
                  style={[
                    styles.paymentCard,
                    selectedPaymentId === method.payment_id && styles.paymentCardActive,
                  ]}
                  onPress={() => setSelectedPaymentId(method.payment_id)}
                >
                  <Text style={styles.paymentType}>
                    {method.payment_type === "CARD" && "💳"}
                    {method.payment_type === "WALLET" && "📱"}
                    {method.payment_type === "UPI" && "🔗"}
                    {` ${method.payment_type}`}
                  </Text>
                  {method.payment_type === "CARD" && method.card_number_last4 && (
                    <Text style={styles.paymentDetails}>
                      **** **** **** {method.card_number_last4}
                    </Text>
                  )}
                  {method.payment_type === "UPI" && method.upi_id && (
                    <Text style={styles.paymentDetails}>{method.upi_id}</Text>
                  )}
                  {method.payment_type === "WALLET" && method.wallet_provider && (
                    <Text style={styles.paymentDetails}>{method.wallet_provider}</Text>
                  )}
                  {method.is_default && (
                    <Text style={styles.defaultBadge}>Default</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        {currentStep > CHECKOUT_STEPS.ADDRESS && (
          <TouchableOpacity
            style={styles.backFooterButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.backFooterButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        {currentStep < CHECKOUT_STEPS.PAYMENT ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              if (currentStep === CHECKOUT_STEPS.ADDRESS && !selectedAddressId) {
                Alert.alert("Error", "Please select a delivery address");
                return;
              }
              setCurrentStep(currentStep + 1);
            }}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.placeOrderButton, placingOrder && styles.placeOrderButtonDisabled]}
            onPress={handlePlaceOrder}
            disabled={placingOrder || !selectedPaymentId}
          >
            {placingOrder ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { alignItems: "center", justifyContent: "center" },
  confirmationContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  confirmationIcon: { fontSize: 80, marginBottom: 20 },
  confirmationTitle: { fontSize: 24, fontWeight: "bold", color: "#2d5016", marginBottom: 12 },
  confirmationText: { fontSize: 16, color: "#666", marginBottom: 8 },
  confirmationSubtext: { fontSize: 14, color: "#999" },
  header: {
    backgroundColor: "#2d5016",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: { marginBottom: 12 },
  backButtonText: { fontSize: 24, color: "#fff" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 16 },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    opacity: 0.5,
  },
  stepDotActive: { opacity: 1 },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#fff",
    opacity: 0.3,
  },
  stepLineActive: { opacity: 0.7 },
  content: { flex: 1, padding: 16 },
  stepTitle: { fontSize: 20, fontWeight: "600", color: "#333", marginBottom: 16 },
  emptyState: { alignItems: "center", marginTop: 40, padding: 20 },
  emptyStateText: { fontSize: 16, color: "#666", marginBottom: 16 },
  addButton: {
    backgroundColor: "#2d5016",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  addressCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  addressCardActive: {
    borderColor: "#2d5016",
    backgroundColor: "#e8f5e9",
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addressLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
  defaultBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2d5016",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addressText: { fontSize: 14, color: "#666", marginBottom: 4 },
  addressLocation: { fontSize: 14, color: "#666", marginBottom: 4 },
  addressPostal: { fontSize: 14, color: "#666" },
  summaryItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryItemName: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  summaryItemDetails: { fontSize: 12, color: "#666", marginBottom: 4 },
  summaryItemTotal: { fontSize: 14, fontWeight: "bold", color: "#2d5016" },
  promoSection: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  promoLabel: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
  promoInputRow: { flexDirection: "row", gap: 8 },
  promoInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  promoApplyButton: {
    backgroundColor: "#2d5016",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  promoApplyButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  promoRemoveButton: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  promoRemoveButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  promoAppliedText: { fontSize: 12, color: "#2d5016", marginTop: 8, fontWeight: "600" },
  priceBreakdown: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  priceLabel: { fontSize: 14, color: "#666" },
  priceValue: { fontSize: 14, color: "#333" },
  discountValue: { color: "#2d5016", fontWeight: "600" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 18, fontWeight: "bold", color: "#333" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#2d5016" },
  notesSection: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  notesLabel: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
  notesInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 80,
    textAlignVertical: "top",
  },
  paymentCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  paymentCardActive: {
    borderColor: "#2d5016",
    backgroundColor: "#e8f5e9",
  },
  paymentType: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  paymentDetails: { fontSize: 14, color: "#666" },
  footer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    gap: 12,
  },
  backFooterButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  backFooterButtonText: { fontSize: 16, fontWeight: "600", color: "#666" },
  nextButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#2d5016",
    alignItems: "center",
  },
  nextButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  placeOrderButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#2d5016",
    alignItems: "center",
  },
  placeOrderButtonDisabled: { opacity: 0.5 },
  placeOrderButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});

