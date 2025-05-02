import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  RefreshControl,
} from "react-native";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import axios from "axios";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../types/navigation";
import * as ImagePicker from "expo-image-picker";

type Props = NativeStackScreenProps<AuthStackParamList, "Home">;

interface GroceryItem {
  name: string;
  expiry_date: string;
  days_left: number;
}

export default function HomeScreen({ navigation }: Props) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");

  const fetchItems = async () => {
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await axios.get("http://127.0.0.1:8000/items", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItems(res.data.items);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load items");
    } finally {
      setRefreshing(false);
    }
  };

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

      const response = await axios.post("http://127.0.0.1:8000/upload-receipt", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert("Success", "Receipt uploaded!");
      setOcrText(response.data.text);
      fetchItems(); // refresh list after upload
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const getColor = (days: number) => {
    if (days <= 2) return "#ff4d4d"; // red
    if (days <= 5) return "#ffaa00"; // orange
    return "#2ecc71"; // green
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={fetchItems} />
    }>
      <Text style={styles.title}>🧾 Receipt Expiry Tracker</Text>

      <Button title="Upload Receipt" onPress={pickImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />}

      <Text style={styles.subtitle}>📋 Your Tracked Items</Text>
      <FlatList
        data={items}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { borderLeftColor: getColor(item.days_left) }]}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text>Expires on: {item.expiry_date}</Text>
            <Text style={{ color: getColor(item.days_left) }}>{item.days_left} days left</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ marginTop: 20 }}>No items found yet.</Text>}
        style={{ width: "100%" }}
      />

      <Button title="Logout" onPress={handleLogout} color="#cc0000" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
    flexGrow: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 10,
  },
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
  },
  itemCard: {
    borderWidth: 1,
    borderLeftWidth: 8,
    padding: 15,
    marginBottom: 12,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  itemName: {
    fontWeight: "bold",
    fontSize: 16,
  },
});
