// screens/SignInScreen.tsx
import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import axios from "axios";
import { registerForPushNotificationsAsync } from "../utils/notifications";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "SignIn">;

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseToken = await userCredential.user.getIdToken();

      const expoPushToken = await registerForPushNotificationsAsync();

      if (expoPushToken) {
        await axios.post("http://127.0.0.1:8000/register-push-token", {
          token: expoPushToken,
        }, {
          headers: {
            Authorization: `Bearer ${firebaseToken}`,
          },
        });
      }

      navigation.navigate("Home");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Sign In" onPress={handleSignIn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});
