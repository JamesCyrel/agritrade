import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator, // Make sure this is imported
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase"; // <-- Import path fixed
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GOOGLE_CLIENT_ID } from "../../lib/authProviders";
import { useEffect } from "react";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_ID,
  });
  
  useEffect(() => {
    const signInWithGoogle = async () => {
      if (response?.type === "success") {
        const { authentication } = response;
        const { accessToken } = authentication;

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: accessToken,
        });

        if (error) {
          Alert.alert("Google Sign-In Error", error.message);
        }
      }
    };

    signInWithGoogle();
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (error) {
        Alert.alert("Login Failed", error.message);
      }
      // No need to navigate, the AuthProvider in _layout.tsx will do it
      
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Login Error", error.message);
      }
    }
    setLoading(false);
  };
  
  const navigateToSignup = () => {
    router.push("/(auth)/signup");
  };
  
  return (
    <View style={styles.container}>
    <View style={styles.header}>
    <Text style={styles.title}>AgriTrade</Text>
    <Text style={styles.subtitle}>Farm-to-Consumer Marketplace</Text>
    </View>
    
    <View style={styles.form}>
    <Text style={styles.label}>Email or Phone</Text>
    <TextInput
    style={styles.input}
    placeholder="Enter your email or phone"
    value={email}
    onChangeText={setEmail}
    keyboardType="email-address"
    autoCapitalize="none"
    />
    
    <Text style={styles.label}>Password</Text>
    <TextInput
    style={styles.input}
    placeholder="Enter your password"
    value={password}
    onChangeText={setPassword}
    secureTextEntry
    />
    
    <TouchableOpacity style={styles.forgotPassword}>
    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
    </TouchableOpacity>
    
    <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.loginButtonText}>Login</Text>
    )}
    </TouchableOpacity>
    
    <View style={styles.divider}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>OR</Text>
    <View style={styles.dividerLine} />
    </View>
    
    <TouchableOpacity
      style={styles.socialButton}
      disabled={!request}
      onPress={() => promptAsync()}
    >
      <Text style={styles.socialButtonText}>Continue with Google</Text>
    </TouchableOpacity>
    
    <View style={styles.signupContainer}>
    <Text style={styles.signupText}>Don't have an account? </Text>
    <TouchableOpacity onPress={navigateToSignup}>
    <Text style={styles.signupLink}>Sign Up</Text>
    </TouchableOpacity>
    </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2d5016",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#2d5016",
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#666",
    fontSize: 14,
  },
  socialButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
  },
  socialButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  signupText: {
    color: "#666",
    fontSize: 14,
  },
  signupLink: {
    color: "#2d5016",
    fontSize: 14,
    fontWeight: "600",
  },
});

