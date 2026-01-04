import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Wheat, User, UserCog, Search, X } from "lucide-react-native";
import { adminAPI } from "../../services/api";

const ROLE_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Farmers", value: "FARMER" },
  { label: "Consumers", value: "CONSUMER" },
  { label: "Admins", value: "ADMIN" },
];

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");

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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Filter by role
    if (selectedRole !== "ALL") {
      result = result.filter(u => u.role === selectedRole);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.full_name && u.full_name.toLowerCase().includes(query)) ||
        (u.farm_name && u.farm_name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.phone && u.phone.includes(query))
      );
    }
    
    return result;
  }, [users, selectedRole, searchQuery]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'FARMER':
        return <Wheat size={24} color="#2d5016" />;
      case 'ADMIN':
        return <UserCog size={24} color="#6366f1" />;
      default:
        return <User size={24} color="#666" />;
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'FARMER':
        return { backgroundColor: '#d4edda', color: '#155724' };
      case 'ADMIN':
        return { backgroundColor: '#e0e7ff', color: '#3730a3' };
      default:
        return { backgroundColor: '#e5e7eb', color: '#374151' };
    }
  };

  const renderUserCard = (user, index) => {
    const roleStyle = getRoleBadgeStyle(user.role);
    
    return (
      <TouchableOpacity 
        key={`${user.role}-${user.user_id}-${index}`} 
        style={styles.userCard}
        onPress={() => router.push(`/admin/users/${user.user_id}`)}
      >
        <View style={styles.userHeader}>
          <View style={styles.avatarContainer}>
            {getRoleIcon(user.role)}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.farm_name || user.full_name || user.email || user.phone || `User #${user.user_id}`}
            </Text>
            <Text style={styles.userEmail}>{user.email || user.phone || '-'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleStyle.backgroundColor }]}>
              <Text style={[styles.roleText, { color: roleStyle.color }]}>{user.role}</Text>
            </View>
          </View>
          {user.role === 'FARMER' && (
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
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>Manage users, verify farmers</Text>
      </View>

      {/* Sticky Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <X size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterTabs}
          contentContainerStyle={styles.filterTabsContent}
        >
          {ROLE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterTab,
                selectedRole === filter.value && styles.filterTabActive,
              ]}
              onPress={() => setSelectedRole(filter.value)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedRole === filter.value && styles.filterTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2d5016" />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <User size={48} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? "Try a different search term" : "No users match the selected filter"}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.resultCount}>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </Text>
            {filteredUsers.map(renderUserCard)}
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
    paddingBottom: 16,
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
  searchContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  filterTabs: {
    marginTop: 12,
  },
  filterTabsContent: {
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: "#2d5016",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  filterTabTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  resultCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
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
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

