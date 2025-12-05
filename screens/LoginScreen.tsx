// Elvina Neila Samas 24060123120031

import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "../firebase";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false); // Toggle Login/Register

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert("Error", "Isi semua kolom!");
    setLoading(true);
    try {
      if (isRegister) {
        // Register Mode
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert("Sukses", "Akun dibuat! Silakan login.");
      } else {
        // Login Mode
        await signInWithEmailAndPassword(auth, email, password);
        // Navigasi ditangani otomatis oleh App.tsx karena ada onAuthStateChanged
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? "Daftar Akun" : "Login Chat"}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : (
        <View>
          <Button title={isRegister ? "Daftar" : "Masuk"} onPress={handleAuth} />
          <View style={{ marginTop: 10 }}>
            <Button 
              title={isRegister ? "Sudah punya akun? Login" : "Belum punya akun? Daftar"} 
              color="gray" 
              onPress={() => setIsRegister(!isRegister)} 
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 26, textAlign: "center", marginBottom: 20, fontWeight: 'bold' },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 15, borderColor: '#ccc' },
});