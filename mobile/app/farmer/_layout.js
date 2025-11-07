import { Tabs } from "expo-router";
import { Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FarmerLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2d5016",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#ddd",
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../../assets/icons/home.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../../assets/icons/orders.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../../assets/icons/products.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: "Archive",
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../../assets/icons/archive.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../../assets/icons/earnings.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="verification"
        options={{
          title: "Verification",
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../../assets/icons/verify.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          href: null, // Hide from tab bar; accessible via profile
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../../assets/icons/profile.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      {/* Hide these screens from tab bar - they're not tabs but accessible via navigation */}
      <Tabs.Screen
        name="profile-setup"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="products/create"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="products/inventory"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="orders/[orderId]"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
    </Tabs>
  );
}

