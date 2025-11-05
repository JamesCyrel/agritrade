import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase"; // <-- Import path fixed
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GOOGLE_CLIENT_ID } from "../../lib/authProviders";

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("CONSUMER");
  const [loading, setLoading] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_ID,
  });
  
  useEffect(() => {
    const signUpWithGoogle = async () => {
      if (response?.type === "success") {
        const { authentication } = response;
        const { accessToken } = authentication;
  
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: accessToken,
        });
  
        if (error) {
          Alert.alert("Google Sign-Up Error", error.message);
        } else {
          // Successfully signed up/logged in
          router.replace("/(tabs)/home"); // navigate to main app screen
        }
      }
    };
  
    signUpWithGoogle();
  }, [response]);
  
  const handleSignup = async () => {
    if (!email) { // Email is required by Supabase auth
      Alert.alert("Error", "Please provide an email address");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        phone: phone || undefined,
        options: {
          data: {
            role: selectedRole,
            // You can add full_name here if you collect it
          },
        },
      });

      if (error) {
        Alert.alert("Signup Failed", error.message);
      } else if (data.session) {
        // This handles "Confirm email" being OFF
        // Navigation will be handled by AuthProvider
      } else if (data.user) {
        // This handles "Confirm email" being ON
        Alert.alert(
          "Signup Successful",
          "Please check your email to confirm your account."
        );
        router.replace("/(auth)/login"); // Send them to login after
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Signup Error", error.message);
      }
    }
    setLoading(false);
  };

  const navigateToLogin = () => {
    router.replace("/(auth)/login"); // Use replace to avoid back button issues
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join AgriTrade today</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Select Role</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === "CONSUMER" && styles.roleButtonActive,
            ]}
            onPress={() => setSelectedRole("CONSUMER")}
          >
            <Text
              style={[
                styles.roleButtonText,
                selectedRole === "CONSUMER" && styles.roleButtonTextActive,
              ]}
            >
              Consumer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === "FARMER" && styles.roleButtonActive,
            ]}
            onPress={() => setSelectedRole("FARMER")}
          >
            <Text
              style={[
                styles.roleButtonText,
                selectedRole === "FARMER" && styles.roleButtonTextActive,
              ]}
            >
              Farmer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === "ADMIN" && styles.roleButtonActive,
            ]}
            onPress={() => setSelectedRole("ADMIN")}
          >
            <Text
              style={[
                styles.roleButtonText,
                selectedRole === "ADMIN" && styles.roleButtonTextActive,
              ]}
            >
              Admin
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone Number (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Create a password (min. 8 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.signupButton}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupButtonText}>Sign Up</Text>
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
          <Text style={styles.socialButtonText}>Sign up with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialButtonText}>Sign up with Facebook</Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
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
  contentContainer: {
    padding: 20,
    paddingTop: 40,
    justifyContent: 'center',
    minHeight: '100%'
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
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
  roleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  roleButtonActive: {
    backgroundColor: "#2d5016",
    borderColor: "#2d5016",
  },
  roleButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  roleButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
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
  signupButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  signupButtonText: {
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
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  loginText: {
    color: "#666",
    fontSize: 14,
  },
  loginLink: {
    color: "#2d5016",
    fontSize: 14,
    fontWeight: "600",
  },
});

