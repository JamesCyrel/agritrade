import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { authAPI } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert(
        "⚠️ Missing Information",
        "Please enter your email or phone number to continue.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    if (!password.trim()) {
      Alert.alert(
        "⚠️ Missing Password",
        "Please enter your password to continue.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    setLoading(true);

    try {
      // Determine if input is email or phone
      const isEmail = email.includes('@');
      const response = await authAPI.login(
        isEmail ? email.trim() : null,
        isEmail ? null : email.trim(),
        password
      );
      
      if (response.success) {
        // Store token
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));

        // If farmer and not approved, send to setup/verification
        if (response.data.user.role === 'FARMER') {
          router.replace('/farmer/profile');
          return;
        }
        // Otherwise go to default redirect
        router.replace(response.data.redirectPath);
      } else {
        // Determine error type for better messaging
        const errorMessage = response.message || "";
        let title = "❌ Login Failed";
        let message = "Invalid email/phone or password. Please try again.";

        if (errorMessage.toLowerCase().includes('password')) {
          title = "🔒 Invalid Password";
          message = "The password you entered is incorrect. Please check your password and try again.";
        } else if (errorMessage.toLowerCase().includes('user') || errorMessage.toLowerCase().includes('not found')) {
          title = "👤 Account Not Found";
          message = "No account found with this email/phone number. Please check your credentials or sign up for a new account.";
        } else if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('phone')) {
          title = "📧 Invalid Email/Phone";
          message = "The email or phone number you entered is invalid. Please check and try again.";
        }

        Alert.alert(
          title,
          message,
          [
            { text: "OK", style: "default" },
            { text: "Sign Up", style: "cancel", onPress: () => router.push("/auth/signup") }
          ]
        );
      }
    } catch (error) {
      // Check if error is from API response (has body with message)
      if (error.body && error.body.message) {
        // This is an API error response (like 401 for invalid credentials)
        const errorMessage = error.body.message || "";
        let title = "❌ Login Failed";
        let message = "Invalid email/phone or password. Please try again.";

        if (errorMessage.toLowerCase().includes('password')) {
          title = "🔒 Invalid Password";
          message = "The password you entered is incorrect. Please check your password and try again.";
        } else if (errorMessage.toLowerCase().includes('user') || errorMessage.toLowerCase().includes('not found')) {
          title = "👤 Account Not Found";
          message = "No account found with this email/phone number. Please check your credentials or sign up for a new account.";
        } else if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('phone')) {
          title = "📧 Invalid Email/Phone";
          message = "The email or phone number you entered is invalid. Please check and try again.";
        }

        Alert.alert(
          title,
          message,
          [
            { text: "OK", style: "default" },
            { text: "Sign Up", style: "cancel", onPress: () => router.push("/auth/signup") }
          ]
        );
      } else {
        // This is a real connection error (network failure, timeout, etc.)
        let title = "❌ Connection Error";
        let message = "Unable to connect to the server. Please check your internet connection and try again.";

        if (error.message && error.message.toLowerCase().includes('network')) {
          title = "📡 Network Error";
          message = "Unable to connect to the server. Please check your internet connection and try again.";
        } else if (error.message && error.message.toLowerCase().includes('timeout')) {
          title = "⏱️ Request Timeout";
          message = "The request took too long. Please check your connection and try again.";
        }

        Alert.alert(
          title,
          message,
          [{ text: "OK", style: "default" }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignup = () => {
    router.push("/auth/signup");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/agritrade_logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
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
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIconText}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
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

        <TouchableOpacity style={styles.socialButton}>
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
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 14,
    paddingLeft: 8,
  },
  eyeIconText: {
    fontSize: 20,
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
  loginButtonDisabled: {
    opacity: 0.6,
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

