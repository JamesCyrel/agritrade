import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { adminAPI } from "../../services/api";

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await adminAPI.listUsers(token);
      setUsers(res.data || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>Manage users, verify farmers</Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={{ color: "#666" }}>Loading...</Text>
        ) : users.length === 0 ? (
          <Text style={{ color: "#666" }}>No users found.</Text>
        ) : (
          <View>
            {/* Farmers */}
            <Text style={styles.groupTitle}>Farmers</Text>
            {users.filter(u => u.role === 'FARMER').length === 0 ? (
              <Text style={styles.emptyGroup}>No farmers.</Text>
            ) : (
              users.filter(u => u.role === 'FARMER').map((user, index) => (
                <TouchableOpacity 
                  key={`F-${user.user_id}-${index}`} 
                  style={styles.userCard}
                  onPress={() => router.push(`/admin/users/${user.user_id}`)}
                >
                  <View style={styles.userHeader}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatar}>🌾</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.farm_name || user.full_name || user.email || user.phone || `User #${user.user_id}`}</Text>
                      <Text style={styles.userEmail}>{user.email || user.phone || '-'}</Text>
                      <Text style={styles.userRole}>{user.role}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            user.verification_status === 'APPROVED'
                              ? '#d4edda'
                              : user.verification_status === 'REJECTED'
                              ? '#fee'
                              : '#fff3cd',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              user.verification_status === 'APPROVED'
                                ? '#155724'
                                : user.verification_status === 'REJECTED'
                                ? '#dc3545'
                                : '#856404',
                          },
                        ]}
                      >
                        {user.verification_status || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Consumers */}
            <Text style={styles.groupTitle}>Consumers</Text>
            {users.filter(u => u.role === 'CONSUMER').length === 0 ? (
              <Text style={styles.emptyGroup}>No consumers.</Text>
            ) : (
              users.filter(u => u.role === 'CONSUMER').map((user, index) => (
                <TouchableOpacity 
                  key={`C-${user.user_id}-${index}`} 
                  style={styles.userCard}
                  onPress={() => router.push(`/admin/users/${user.user_id}`)}
                >
                  <View style={styles.userHeader}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatar}>👤</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.full_name || user.email || user.phone || `User #${user.user_id}`}</Text>
                      <Text style={styles.userEmail}>{user.email || user.phone || '-'}</Text>
                      <Text style={styles.userRole}>{user.role}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Admins */}
            <Text style={styles.groupTitle}>Admins</Text>
            {users.filter(u => u.role === 'ADMIN').length === 0 ? (
              <Text style={styles.emptyGroup}>No admins.</Text>
            ) : (
              users.filter(u => u.role === 'ADMIN').map((user, index) => (
                <TouchableOpacity 
                  key={`A-${user.user_id}-${index}`} 
                  style={styles.userCard}
                  onPress={() => router.push(`/admin/users/${user.user_id}`)}
                >
                  <View style={styles.userHeader}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatar}>👤</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.full_name || user.email || user.phone || `User #${user.user_id}`}</Text>
                      <Text style={styles.userEmail}>{user.email || user.phone || '-'}</Text>
                      <Text style={styles.userRole}>{user.role}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2d5016",
    marginTop: 8,
    marginBottom: 8,
  },
  emptyGroup: {
    color: "#666",
    marginBottom: 8,
  },
  userCard: {
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
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatar: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    color: "#2d5016",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

