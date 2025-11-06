import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { adminAPI } from "../../services/api";

export default function AdminPayoutsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payouts, setPayouts] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve', 'complete', 'reject'
  const [transactionRef, setTransactionRef] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPayouts();
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [selectedStatus]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const queryFilters = {};
      if (selectedStatus && selectedStatus !== "ALL") {
        queryFilters.status = selectedStatus;
      }

      const res = await adminAPI.getAllPayouts(token, queryFilters);
      if (res.success) {
        setPayouts(res.data || []);
      }
    } catch (error) {
      console.error("Load payouts error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayouts();
    setRefreshing(false);
  };

  const handleAction = (payout, type) => {
    setSelectedPayout(payout);
    setActionType(type);
    setShowActionModal(true);
    setTransactionRef("");
    setRejectReason("");
  };

  const confirmAction = async () => {
    if (!selectedPayout) return;

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      let response;

      if (actionType === "approve") {
        response = await adminAPI.approvePayout(
          token,
          selectedPayout.payout_id,
          transactionRef || null,
          null
        );
      } else if (actionType === "complete") {
        if (!transactionRef) {
          Alert.alert("Required", "Transaction reference is required to complete payout");
          setProcessing(false);
          return;
        }
        response = await adminAPI.completePayout(
          token,
          selectedPayout.payout_id,
          transactionRef,
          null
        );
      } else if (actionType === "reject") {
        response = await adminAPI.rejectPayout(
          token,
          selectedPayout.payout_id,
          rejectReason || null
        );
      }

      if (response?.success) {
        Alert.alert("Success", `Payout ${actionType}d successfully`);
        setShowActionModal(false);
        setSelectedPayout(null);
        await loadPayouts();
      } else {
        Alert.alert("Error", response?.message || `Failed to ${actionType} payout`);
      }
    } catch (error) {
      Alert.alert("Error", error?.message || `Failed to ${actionType} payout`);
    } finally {
      setProcessing(false);
    }
  };

  const formatPeso = (n) => `₱${parseFloat(n || 0).toFixed(2)}`;

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "#28a745";
      case "PROCESSING":
        return "#ffc107";
      case "FAILED":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const statusTabs = ["ALL", "PENDING", "PROCESSING", "COMPLETED", "FAILED"];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payout Management</Text>
        <Text style={styles.headerSubtitle}>Manage farmer payouts</Text>
      </View>

      <View style={styles.statusTabs}>
        {statusTabs.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusTab,
              selectedStatus === status && styles.statusTabActive,
            ]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text
              style={[
                styles.statusTabText,
                selectedStatus === status && styles.statusTabTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2d5016" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {payouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No payouts found</Text>
            </View>
          ) : (
            payouts.map((payout) => (
              <View key={payout.payout_id} style={styles.payoutCard}>
                <View style={styles.payoutHeader}>
                  <View>
                    <Text style={styles.farmerName}>{payout.farmer_name || payout.farm_name || "Unknown Farmer"}</Text>
                    <Text style={styles.farmerEmail}>{payout.farmer_email || ""}</Text>
                    <Text style={styles.payoutDate}>
                      {new Date(payout.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payout.status) }]}>
                    <Text style={styles.statusText}>{payout.status}</Text>
                  </View>
                </View>

                <View style={styles.payoutDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={styles.detailValue}>{formatPeso(payout.net_amount || payout.total_earnings)}</Text>
                  </View>
                  {payout.bank_account_number && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bank Account:</Text>
                      <Text style={styles.detailValue}>{payout.bank_account_number}</Text>
                    </View>
                  )}
                  {payout.bank_name && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bank:</Text>
                      <Text style={styles.detailValue}>{payout.bank_name}</Text>
                    </View>
                  )}
                  {payout.transaction_reference && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Transaction Ref:</Text>
                      <Text style={styles.detailValue}>{payout.transaction_reference}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  {payout.status === "PENDING" && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleAction(payout, "approve")}
                      >
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleAction(payout, "reject")}
                      >
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {payout.status === "PROCESSING" && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleAction(payout, "complete")}
                    >
                      <Text style={styles.actionButtonText}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === "approve" && "Approve Payout"}
              {actionType === "complete" && "Complete Payout"}
              {actionType === "reject" && "Reject Payout"}
            </Text>

            {selectedPayout && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  Farmer: {selectedPayout.farmer_name || selectedPayout.farm_name}
                </Text>
                <Text style={styles.modalInfoText}>
                  Amount: {formatPeso(selectedPayout.net_amount || selectedPayout.total_earnings)}
                </Text>
              </View>
            )}

            {(actionType === "complete" || actionType === "approve") && (
              <>
                <Text style={styles.inputLabel}>Transaction Reference *</Text>
                <TextInput
                  style={styles.input}
                  value={transactionRef}
                  onChangeText={setTransactionRef}
                  placeholder="Enter transaction reference"
                  placeholderTextColor="#999"
                />
              </>
            )}

            {actionType === "reject" && (
              <>
                <Text style={styles.inputLabel}>Rejection Reason (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Enter reason for rejection"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowActionModal(false);
                  setSelectedPayout(null);
                  setTransactionRef("");
                  setRejectReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmAction}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {actionType === "approve" && "Approve"}
                    {actionType === "complete" && "Complete"}
                    {actionType === "reject" && "Reject"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#2d5016",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e0e0",
  },
  statusTabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  statusTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  statusTabActive: {
    backgroundColor: "#2d5016",
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  statusTabTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  payoutCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  farmerEmail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 12,
    color: "#999",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  payoutDetails: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: "#28a745",
  },
  completeButton: {
    backgroundColor: "#17a2b8",
  },
  rejectButton: {
    backgroundColor: "#dc3545",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2d5016",
    marginBottom: 16,
  },
  modalInfo: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  confirmButton: {
    backgroundColor: "#2d5016",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

