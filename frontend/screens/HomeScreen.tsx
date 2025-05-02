import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrText, setOcrText] = useState<string>("");

  const handleLogout = async () => {
    await signOut(auth);
    navigation.navigate("SignIn");
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await uploadImage(uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();

      formData.append("file", {
        uri,
        name: "receipt.jpg",
        type: "image/jpeg",
      } as any);

      const response = await axios.post("http://YOUR_BACKEND_URL/upload-receipt", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert("Success", "Receipt uploaded!");
      setOcrText(response.data.text);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Upload Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📄 Receipt Expiry Tracker</Text>

      <Button title="Upload Receipt" onPress={pickImage} />
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.image} />
      )}

      {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />}

      {ocrText ? (
        <View style={styles.ocrBox}>
          <Text style={styles.ocrLabel}>🧠 OCR Result:</Text>
          <Text>{ocrText}</Text>
        </View>
      ) : null}

      <Button title="Logout" onPress={handleLogout} color="#cc0000" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
  },
  ocrBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    width: "100%",
  },
  ocrLabel: {
    fontWeight: "bold",
    marginBottom: 5,
  },
});
