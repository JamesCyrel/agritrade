import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export default function ConsumerFavoritesScreen() {
  const favorites = [
    { name: "Basmati Rice", farmer: "Green Valley Farm", price: "₹120/kg", rating: "4.8" },
    { name: "Sona Masuri", farmer: "Organic Rice Co.", price: "₹95/kg", rating: "4.9" },
    { name: "Jasmine Rice", farmer: "Premium Paddy", price: "₹110/kg", rating: "4.7" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        <Text style={styles.headerSubtitle}>Your saved products</Text>
      </View>

      <ScrollView style={styles.content}>
        {favorites.map((item, index) => (
          <TouchableOpacity key={index} style={styles.favoriteCard}>
            <View style={styles.itemImage}>
              <Text style={styles.itemImagePlaceholder}>🌾</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemFarmer}>{item.farmer}</Text>
              <Text style={styles.itemRating}>⭐ {item.rating}</Text>
              <Text style={styles.itemPrice}>{item.price}</Text>
            </View>
            <TouchableOpacity style={styles.heartButton}>
              <Text style={styles.heartIcon}>❤️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
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
  favoriteCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemImagePlaceholder: {
    fontSize: 32,
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
  itemFarmer: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  itemRating: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2d5016",
  },
  heartButton: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  heartIcon: {
    fontSize: 24,
  },
});

