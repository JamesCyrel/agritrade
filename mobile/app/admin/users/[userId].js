import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { adminAPI } from "../../../services/api";
import { Wheat, UserCog, User } from "lucide-react-native";

export default function UserDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [suspending, setSuspending] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await adminAPI.getUserProfile(token, userId);
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        Alert.alert("Error", res.message || "Failed to load user details");
        router.back();
      }
    } catch (error) {
      console.error("Load user error:", error);
      Alert.alert("Error", "Failed to load user details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = () => {
    Alert.alert(
      "Suspend User",
      "Are you sure you want to suspend this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            try {
              setSuspending(true);
              const token = await AsyncStorage.getItem("authToken");
              const res = await adminAPI.suspendUser(token, userId, "Suspended by admin");
              if (res.success) {
                Alert.alert("Success", "User suspended successfully", [
                  { text: "OK", onPress: () => router.back() },
                ]);
              } else {
                Alert.alert("Error", res.message || "Failed to suspend user");
              }
            } catch (error) {
              console.error("Suspend user error:", error);
              Alert.alert("Error", "Failed to suspend user");
            } finally {
              setSuspending(false);
            }
          },
        },
      ]
    );
  };

  const handleActivate = () => {
    Alert.alert(
      "Activate User",
      "Are you sure you want to activate this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate",
          onPress: async () => {
            try {
              setActivating(true);
              const token = await AsyncStorage.getItem("authToken");
              const res = await adminAPI.activateUser(token, userId);
              if (res.success) {
                Alert.alert("Success", "User activated successfully", [
                  { text: "OK", onPress: () => router.back() },
                ]);
              } else {
                Alert.alert("Error", res.message || "Failed to activate user");
              }
            } catch (error) {
              console.error("Activate user error:", error);
              Alert.alert("Error", "Failed to activate user");
            } finally {
              setActivating(false);
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

  if (!user) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>User not found</Text>
      </View>
    );
  }

  const isSuspended = user.is_suspended === true;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            {user.role === "FARMER" ? (
              <Wheat size={40} color="#2d5016" />
            ) : user.role === "ADMIN" ? (
              <UserCog size={40} color="#2d5016" />
            ) : (
              <User size={40} color="#2d5016" />
            )}
          </View>
          <Text style={styles.name}>
            {user.farm_name || user.full_name || user.email || `User #${user.user_id}`}
          </Text>
          <Text style={styles.email}>{user.email || user.phone || "-"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
          {isSuspended && (
            <View style={styles.suspendedBadge}>
              <Text style={styles.suspendedText}>SUSPENDED</Text>
            </View>
          )}
        </View>

        {/* User Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{user.user_id}</Text>
          </View>
          {user.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registered:</Text>
            <Text style={styles.infoValue}>
              {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Farmer Specific Info */}
        {user.role === "FARMER" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Farmer Information</Text>
            {user.farm_name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Farm Name:</Text>
                <Text style={styles.infoValue}>{user.farm_name}</Text>
              </View>
            )}
            {user.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{user.address}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verification Status:</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      user.verification_status === "APPROVED"
                        ? "#d4edda"
                        : user.verification_status === "REJECTED"
                        ? "#fee"
                        : "#fff3cd",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        user.verification_status === "APPROVED"
                          ? "#155724"
                          : user.verification_status === "REJECTED"
                          ? "#dc3545"
                          : "#856404",
                    },
                  ]}
                >
                  {user.verification_status || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Consumer Specific Info */}
        {user.role === "CONSUMER" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consumer Information</Text>
            {user.addresses && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Saved Addresses:</Text>
                <Text style={styles.infoValue}>{user.addresses.length || 0}</Text>
              </View>
            )}
            {user.payment_methods && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Methods:</Text>
                <Text style={styles.infoValue}>{user.payment_methods.length || 0}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {isSuspended ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.activateButton]}
              onPress={handleActivate}
              disabled={activating}
            >
              {activating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Activate User</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.suspendButton]}
              onPress={handleSuspend}
              disabled={suspending}
            >
              {suspending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Suspend User</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#2d5016",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    fontSize: 40,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 12,
    color: "#2d5016",
    fontWeight: "600",
  },
  suspendedBadge: {
    backgroundColor: "#fee",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suspendedText: {
    fontSize: 12,
    color: "#dc3545",
    fontWeight: "700",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionsSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  suspendButton: {
    backgroundColor: "#dc3545",
  },
  activateButton: {
    backgroundColor: "#28a745",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

