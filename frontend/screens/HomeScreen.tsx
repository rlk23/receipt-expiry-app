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
  Modal,
  TextInput,
} from "react-native";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import axios from "axios";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../types/navigation";
import * as ImagePicker from "expo-image-picker";

type Props = NativeStackScreenProps<AuthStackParamList, "Home">;

interface GroceryItem {
  id: string;
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
  const [filter, setFilter] = useState<"all" | "soon" | "fresh">("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editExpiry, setEditExpiry] = useState("");

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
      fetchItems();
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.delete(`http://127.0.0.1:8000/items/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchItems();
    } catch (err: any) {
      Alert.alert("Delete failed", err.message || "Unable to delete item.");
    }
  };

  const handleEditItem = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.put(`http://127.0.0.1:8000/items/${editItem?.id}`, {
        name: editName,
        expiry_date: editExpiry,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModalVisible(false);
      fetchItems();
    } catch (err: any) {
      Alert.alert("Update failed", err.message || "Unable to update item.");
    }
  };

  const getColor = (days: number) => {
    if (days <= 2) return "#ff4d4d";
    if (days <= 5) return "#ffaa00";
    return "#2ecc71";
  };

  const filteredItems = items.filter((item) => {
    if (filter === "soon") return item.days_left <= 2;
    if (filter === "fresh") return item.days_left > 5;
    return true;
  });

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchItems} />}
    >
      <Text style={styles.title}>🧾 Receipt Expiry Tracker</Text>

      <Button title="Upload Receipt" onPress={pickImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />}

      <Text style={styles.subtitle}>📋 Your Tracked Items</Text>

      <View style={styles.filterContainer}>
        <Button title="All" onPress={() => setFilter("all")} color={filter === "all" ? "#2196F3" : "#ccc"} />
        <Button title="Expiring Soon" onPress={() => setFilter("soon")} color={filter === "soon" ? "#FF6B6B" : "#ccc"} />
        <Button title="Fresh" onPress={() => setFilter("fresh")} color={filter === "fresh" ? "#4CAF50" : "#ccc"} />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { borderLeftColor: getColor(item.days_left) }]}>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={{ flexDirection: "row", gap: 5 }}>
                <Button title="✏️" onPress={() => {
                  setEditItem(item);
                  setEditName(item.name);
                  setEditExpiry(item.expiry_date);
                  setModalVisible(true);
                }} />
                <Button title="🗑️" color="#cc0000" onPress={() => Alert.alert("Delete Item", `Are you sure you want to delete \"${item.name}\"?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", onPress: () => handleDeleteItem(item.id) }
                ])} />
              </View>
            </View>
            <Text>Expires on: {item.expiry_date}</Text>
            <Text style={{ color: getColor(item.days_left) }}>{item.days_left} days left</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ marginTop: 20 }}>No items found.</Text>}
        style={{ width: "100%" }}
      />

      <Button title="Logout" onPress={handleLogout} color="#cc0000" />

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit Item</Text>
          <TextInput value={editName} onChangeText={setEditName} placeholder="Item Name" style={styles.input} />
          <TextInput value={editExpiry} onChangeText={setEditExpiry} placeholder="Expiry (YYYY-MM-DD)" style={styles.input} />
          <Button title="Save" onPress={handleEditItem} />
          <Button title="Cancel" color="#aaa" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "center", flexGrow: 1 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 20, textAlign: "center" },
  subtitle: { fontSize: 18, marginTop: 20, marginBottom: 10 },
  image: { width: 200, height: 200, marginVertical: 10, borderRadius: 10 },
  filterContainer: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 10 },
  itemCard: { borderWidth: 1, borderLeftWidth: 8, padding: 15, marginBottom: 12, borderColor: "#ccc", borderRadius: 8, backgroundColor: "#fff" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontWeight: "bold", fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: "center", padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 12, borderRadius: 5 },
});
