import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { farmerOrderAPI } from "../../../services/api";

const ORDER_STATUSES = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

const REJECTION_REASONS = [
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "CANNOT_DELIVER_TO_LOCATION", label: "Cannot deliver to location" },
  { value: "PRODUCT_UNAVAILABLE", label: "Product unavailable" },
  { value: "OTHER", label: "Other" },
];

const getStatusColor = (status) => {
  switch (status) {
    case ORDER_STATUSES.PENDING:
      return "#ff9800";
    case ORDER_STATUSES.CONFIRMED:
      return "#2196f3";
    case ORDER_STATUSES.PREPARING:
      return "#9c27b0";
    case ORDER_STATUSES.OUT_FOR_DELIVERY:
      return "#00bcd4";
    case ORDER_STATUSES.DELIVERED:
      return "#4caf50";
    case ORDER_STATUSES.CANCELLED:
      return "#f44336";
    default:
      return "#666";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case ORDER_STATUSES.PENDING:
      return "Pending";
    case ORDER_STATUSES.CONFIRMED:
      return "Confirmed";
    case ORDER_STATUSES.PREPARING:
      return "Preparing";
    case ORDER_STATUSES.OUT_FOR_DELIVERY:
      return "Out for Delivery";
    case ORDER_STATUSES.DELIVERED:
      return "Completed";
    case ORDER_STATUSES.CANCELLED:
      return "Canceled";
    default:
      return status;
  }
};

const getNextStatus = (currentStatus) => {
  switch (currentStatus) {
    case ORDER_STATUSES.CONFIRMED:
      return ORDER_STATUSES.OUT_FOR_DELIVERY;
    case ORDER_STATUSES.PREPARING:
      return ORDER_STATUSES.OUT_FOR_DELIVERY;
    case ORDER_STATUSES.OUT_FOR_DELIVERY:
      return ORDER_STATUSES.DELIVERED;
    default:
      return null;
  }
};

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await farmerOrderAPI.getOrderDetails(token, orderId);
      if (res.success) {
        setOrder(res.data);
      } else {
        Alert.alert("Error", "Failed to load order details");
        router.back();
      }
    } catch (error) {
      console.error("Load order details error:", error);
      Alert.alert("Error", "Failed to load order details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    Alert.alert(
      "Accept Order",
      "Are you sure you want to accept this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem("authToken");
              const res = await farmerOrderAPI.acceptOrder(token, orderId);
              if (res.success) {
                Alert.alert("Success", "Order accepted successfully");
                loadOrderDetails();
              } else {
                Alert.alert("Error", res.message || "Failed to accept order");
              }
            } catch (error) {
              console.error("Accept order error:", error);
              Alert.alert("Error", error.message || "Failed to accept order");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectOrder = () => {
    if (!rejectionReason) {
      Alert.alert("Error", "Please select a rejection reason");
      return;
    }

    Alert.alert(
      "Reject Order",
      "Are you sure you want to reject this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem("authToken");
              const res = await farmerOrderAPI.rejectOrder(
                token,
                orderId,
                rejectionReason,
                rejectionNotes || null
              );
              if (res.success) {
                Alert.alert("Success", "Order rejected successfully");
                setShowRejectModal(false);
                setRejectionReason("");
                setRejectionNotes("");
                loadOrderDetails();
              } else {
                Alert.alert("Error", res.message || "Failed to reject order");
              }
            } catch (error) {
              console.error("Reject order error:", error);
              Alert.alert("Error", error.message || "Failed to reject order");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = async (newStatus) => {
    const statusLabel = getStatusLabel(newStatus);
    Alert.alert(
      "Update Status",
      `Are you sure you want to mark this order as "${statusLabel}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem("authToken");
              const res = await farmerOrderAPI.updateOrderStatus(
                token,
                orderId,
                newStatus
              );
              if (res.success) {
                Alert.alert("Success", "Order status updated successfully");
                loadOrderDetails();
              } else {
                Alert.alert("Error", res.message || "Failed to update status");
              }
            } catch (error) {
              console.error("Update status error:", error);
              Alert.alert("Error", error.message || "Failed to update status");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Order not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(order.status);
  const statusLabel = getStatusLabel(order.status);
  const nextStatus = getNextStatus(order.status);

  // Parse items if it's a JSON string
  let items = [];
  if (order.items) {
    if (typeof order.items === "string") {
      try {
        items = JSON.parse(order.items);
      } catch (e) {
        items = [];
      }
    } else {
      items = order.items;
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Order Header */}
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <InfoRow label="Order Date" value={formatDate(order.created_at)} />
          <InfoRow label="Consumer Email" value={order.consumer_email || "N/A"} />
          {order.consumer_phone && (
            <InfoRow label="Phone" value={order.consumer_phone} />
          )}
          <InfoRow
            label="Payment Type"
            value={order.payment_type === "COD" ? "💰 Cash on Delivery" : "💳 Digital Payment"}
          />
        </View>

        {/* Delivery Address */}
        {order.delivery_address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Text style={styles.addressText}>{order.delivery_address}</Text>
            {(order.city || order.state || order.postal_code) && (
              <Text style={styles.addressText}>
                {[order.city, order.state, order.postal_code].filter(Boolean).join(", ")}
              </Text>
            )}
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} {item.sack_size_kg ? `sacks (${item.sack_size_kg}kg each)` : "kg"} × ₱{parseFloat(item.unit_price).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>
                ₱{parseFloat(item.subtotal).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <SummaryRow label="Subtotal" value={parseFloat(order.subtotal).toFixed(2)} />
          {order.discount_amount > 0 && (
            <SummaryRow label="Discount" value={`-${parseFloat(order.discount_amount).toFixed(2)}`} />
          )}
          <SummaryRow label="Delivery Fee" value={parseFloat(order.delivery_fee).toFixed(2)} />
          <SummaryRow label="Tax (12%)" value={parseFloat(order.tax).toFixed(2)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{parseFloat(order.total_amount).toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {order.status === ORDER_STATUSES.PENDING && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptOrder}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Accept Order</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setShowRejectModal(true)}
              disabled={processing}
            >
              <Text style={[styles.actionButtonText, styles.rejectButtonText]}>
                Reject Order
              </Text>
            </TouchableOpacity>
          </>
        )}

        {nextStatus && (
          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={() => handleUpdateStatus(nextStatus)}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                Mark as {getStatusLabel(nextStatus)}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Order</Text>
            <Text style={styles.modalSubtitle}>Please select a reason for rejection</Text>

            {REJECTION_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonOption,
                  rejectionReason === reason.value && styles.reasonOptionSelected,
                ]}
                onPress={() => setRejectionReason(reason.value)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    rejectionReason === reason.value && styles.reasonTextSelected,
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.notesLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter additional notes..."
              value={rejectionNotes}
              onChangeText={setRejectionNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setRejectionNotes("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleRejectOrder}
                disabled={processing || !rejectionReason}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>₱{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: "#666",
  },
  itemSubtotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d5016",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#2d5016",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2d5016",
  },
  notesText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  actions: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  acceptButton: {
    backgroundColor: "#4caf50",
  },
  rejectButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#f44336",
  },
  updateButton: {
    backgroundColor: "#2d5016",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rejectButtonText: {
    color: "#f44336",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  reasonOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    marginBottom: 12,
  },
  reasonOptionSelected: {
    borderColor: "#2d5016",
    backgroundColor: "#e8f5e9",
  },
  reasonText: {
    fontSize: 16,
    color: "#333",
  },
  reasonTextSelected: {
    color: "#2d5016",
    fontWeight: "600",
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 8,
  },
  modalCancelButton: {
    backgroundColor: "#f5f5f5",
  },
  modalConfirmButton: {
    backgroundColor: "#f44336",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

