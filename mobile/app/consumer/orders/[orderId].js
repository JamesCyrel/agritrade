import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consumerAPI } from "../../../services/api";

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewData, setReviewData] = useState(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useFocusEffect(
    React.useCallback(() => {
      if (order && order.status === "DELIVERED") {
        checkReviewStatus();
      }
    }, [order])
  );

  const loadOrder = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.getOrderDetails(token, orderId);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        Alert.alert("Error", res.message || "Failed to load order details");
        router.back();
      }
    } catch (error) {
      console.error("Load order error:", error);
      Alert.alert("Error", "Failed to load order details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkReviewStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await consumerAPI.checkOrderReview(token, orderId);
      if (res.success) {
        setHasReviewed(res.data.hasReviewed);
        setReviewData(res.data.review);
      }
    } catch (error) {
      console.error("Check review status error:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "#ff9800";
      case "CONFIRMED":
        return "#2196f3";
      case "PREPARING":
        return "#9c27b0";
      case "OUT_FOR_DELIVERY":
        return "#00bcd4";
      case "DELIVERED":
        return "#4caf50";
      case "CANCELLED":
        return "#f44336";
      default:
        return "#666";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCancelOrder = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              const token = await AsyncStorage.getItem("authToken");
              const res = await consumerAPI.cancelOrder(token, orderId);
              
              if (res.success) {
                Alert.alert("Success", "Order cancelled successfully", [
                  {
                    text: "OK",
                    onPress: () => {
                      router.back();
                    },
                  },
                ]);
              } else {
                Alert.alert("Error", res.message || "Failed to cancel order");
              }
            } catch (error) {
              console.error("Cancel order error:", error);
              Alert.alert("Error", "Failed to cancel order");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.emptyStateText}>Order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.order_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status.replace("_", " ")}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items && order.items.map((item) => (
            <View key={item.order_item_id} style={styles.orderItem}>
              <View style={styles.orderItemImage}>
                {item.images && item.images.length > 0 ? (
                  <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
                ) : (
                  <Text style={styles.itemImagePlaceholder}>🌾</Text>
                )}
              </View>
              <View style={styles.orderItemDetails}>
                <Text style={styles.orderItemName}>{item.variety_name}</Text>
                <Text style={styles.orderItemType}>{item.rice_type}</Text>
                <Text style={styles.orderItemQuantity}>
                  {item.quantity} {item.sack_size_kg ? `× ${item.sack_size_kg}kg sacks` : "kg"} @ ₱{item.unit_price}
                </Text>
                <Text style={styles.orderItemTotal}>₱{parseFloat(item.subtotal).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        {order.delivery_address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <View style={styles.addressCard}>
              <Text style={styles.addressText}>{order.delivery_address}</Text>
              {order.city && (
                <Text style={styles.addressLocation}>
                  {order.city} {order.state && `, ${order.state}`}
                </Text>
              )}
              {order.postal_code && (
                <Text style={styles.addressPostal}>{order.postal_code}</Text>
              )}
            </View>
          </View>
        )}

        {/* Farmer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farmer</Text>
          <View style={styles.farmerCard}>
            <Text style={styles.farmerName}>{order.farm_name || order.farmer_name}</Text>
            <TouchableOpacity
              style={styles.viewStorefrontButton}
              onPress={() => {
                if (order.farmer_id) {
                  router.push(`/consumer/farmers/${order.farmer_id}/storefront`);
                }
              }}
            >
              <Text style={styles.viewStorefrontText}>View Storefront →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₱{parseFloat(order.subtotal).toFixed(2)}</Text>
            </View>
            {order.discount_amount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -₱{parseFloat(order.discount_amount).toFixed(2)}
                </Text>
              </View>
            )}
            {order.promo_code && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Promo Code</Text>
                <Text style={styles.summaryValue}>{order.promo_code}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₱{parseFloat(order.delivery_fee).toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>₱{parseFloat(order.tax).toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₱{parseFloat(order.total_amount).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Order Notes */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Order Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Date</Text>
          <Text style={styles.dateText}>{formatDate(order.created_at)}</Text>
        </View>

        {/* Cancel Order Button - Only show for pending orders */}
        {order.status === "PENDING" && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.cancelButtonIcon}>❌</Text>
                  <Text style={styles.cancelButtonText}>Cancel Order</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.cancelNote}>
              You can cancel this order as it's still pending confirmation from the farmer.
            </Text>
          </View>
        )}

        {/* Review Prompt - Only show for delivered orders */}
        {order.status === "DELIVERED" && (
          <View style={styles.section}>
            {hasReviewed ? (
              <View style={styles.reviewSubmittedCard}>
                <Text style={styles.reviewSubmittedIcon}>⭐</Text>
                <Text style={styles.reviewSubmittedText}>Thank you for your review!</Text>
                {reviewData && (
                  <View style={styles.reviewDisplay}>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.reviewStar}>
                          {star <= reviewData.rating ? "⭐" : "☆"}
                        </Text>
                      ))}
                    </View>
                    {reviewData.comment && (
                      <Text style={styles.reviewComment}>{reviewData.comment}</Text>
                    )}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.editReviewButton}
                  onPress={() => router.push(`/consumer/orders/${orderId}/review`)}
                >
                  <Text style={styles.editReviewButtonText}>Edit Review</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.reviewPromptCard}>
                <Text style={styles.reviewPromptIcon}>⭐</Text>
                <Text style={styles.reviewPromptTitle}>Rate Your Experience</Text>
                <Text style={styles.reviewPromptText}>
                  How was your order? Help other customers by sharing your experience!
                </Text>
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => router.push(`/consumer/orders/${orderId}/review`)}
                >
                  <Text style={styles.reviewButtonText}>Leave a Review</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { alignItems: "center", justifyContent: "center" },
  header: {
    backgroundColor: "#2d5016",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNumber: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: "600", color: "#fff", textTransform: "capitalize" },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 12 },
  orderItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemImage: { width: "100%", height: "100%", borderRadius: 8 },
  itemImagePlaceholder: { fontSize: 32 },
  orderItemDetails: { flex: 1 },
  orderItemName: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  orderItemType: { fontSize: 12, color: "#666", marginBottom: 4 },
  orderItemQuantity: { fontSize: 14, color: "#666", marginBottom: 4 },
  orderItemTotal: { fontSize: 16, fontWeight: "bold", color: "#2d5016" },
  addressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressText: { fontSize: 14, color: "#666", marginBottom: 4 },
  addressLocation: { fontSize: 14, color: "#666", marginBottom: 4 },
  addressPostal: { fontSize: 14, color: "#666" },
  farmerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  farmerName: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
  viewStorefrontButton: {
    backgroundColor: "#2d5016",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  viewStorefrontText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryValue: { fontSize: 14, color: "#333" },
  discountValue: { color: "#2d5016", fontWeight: "600" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 18, fontWeight: "bold", color: "#333" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#2d5016" },
  notesText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: "#f44336",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cancelButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cancelNote: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    fontStyle: "italic",
  },
  reviewPromptCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2d5016",
    borderStyle: "dashed",
  },
  reviewPromptIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  reviewPromptTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  reviewPromptText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  reviewButton: {
    backgroundColor: "#2d5016",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  reviewSubmittedCard: {
    backgroundColor: "#e8f5e9",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4caf50",
  },
  reviewSubmittedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  reviewSubmittedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d5016",
    marginBottom: 12,
  },
  reviewDisplay: {
    width: "100%",
    marginBottom: 12,
  },
  reviewStars: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  reviewStar: {
    fontSize: 20,
    marginHorizontal: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 16,
  },
  editReviewButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editReviewButtonText: {
    fontSize: 14,
    color: "#2d5016",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  emptyStateText: { fontSize: 16, color: "#666" },
});

