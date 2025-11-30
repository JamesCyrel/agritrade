import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // For now, redirect to login screen
    // Later, this will check authentication status and redirect accordingly
    const timer = setTimeout(() => {
      router.replace("/auth/login");
    }, 2000); // Increased time slightly to show logo

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/agritrade_logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#2d5016" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
});
