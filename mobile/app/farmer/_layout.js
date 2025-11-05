import { Tabs } from "expo-router";
import { Text } from "react-native";
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
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🌾</Text>,
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: "Archive",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🗄️</Text>,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💰</Text>,
        }}
      />
      <Tabs.Screen
        name="verification"
        options={{
          title: "Verification",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📝</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
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

