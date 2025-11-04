import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";

export default function ConsumerHomeScreen() {
  const router = useRouter();

  const featuredSections = [
    {
      title: "Featured Farmers",
      items: [
        { name: "Green Valley Farm", rating: "4.8", location: "15km away" },
        { name: "Organic Rice Co.", rating: "4.9", location: "22km away" },
        { name: "Premium Paddy", rating: "4.7", location: "30km away" },
      ],
    },
    {
      title: "Popular Rice Varieties",
      items: [
        { name: "Basmati Rice", price: "₹120/kg" },
        { name: "Sona Masuri", price: "₹95/kg" },
        { name: "Jasmine Rice", price: "₹110/kg" },
      ],
    },
    {
      title: "New Arrivals",
      items: [
        { name: "Organic Brown Rice", price: "₹140/kg" },
        { name: "Red Rice", price: "₹130/kg" },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>AgriTrade</Text>
          <TouchableOpacity
            onPress={() => {
              // Navigate to profile/cart
              console.log("Navigate to profile");
            }}
          >
            <Text style={styles.headerIcon}>👤</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Fresh Rice, Direct from Farmers</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for rice varieties or farmers..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {featuredSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.card}
                  onPress={() => {
                    // Navigate to product/farmer details
                    console.log(`Navigate to ${item.name}`);
                  }}
                >
                  <View style={styles.cardImage}>
                    <Text style={styles.cardImagePlaceholder}>🌾</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.rating && (
                    <Text style={styles.cardRating}>⭐ {item.rating}</Text>
                  )}
                  {item.location && (
                    <Text style={styles.cardLocation}>{item.location}</Text>
                  )}
                  {item.price && (
                    <Text style={styles.cardPrice}>{item.price}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                console.log("Navigate to My Orders");
              }}
            >
              <Text style={styles.actionIcon}>📦</Text>
              <Text style={styles.actionText}>My Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                console.log("Navigate to Cart");
              }}
            >
              <Text style={styles.actionIcon}>🛒</Text>
              <Text style={styles.actionText}>Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                console.log("Navigate to Favorites");
              }}
            >
              <Text style={styles.actionIcon}>❤️</Text>
              <Text style={styles.actionText}>Favorites</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerIcon: {
    fontSize: 24,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e0e0",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 50,
  },
  searchIcon: {
    fontSize: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardImagePlaceholder: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  cardRating: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2d5016",
    marginTop: 4,
  },
  quickActions: {
    padding: 16,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
});

