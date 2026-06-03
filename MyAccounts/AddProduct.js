import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

export default function AddProductScreen() {
  const [productName, setProductName] = useState("");
  const [unit, setUnit] = useState("");
  const [openingQty, setOpeningQty] = useState("");
  const [openingCost, setOpeningCost] = useState("");
  const [nextId, setNextId] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getNextProductId = async () => {
      const snap = await getDocs(collection(db, "products"));
      let max = 0;
      snap.forEach(d => {
        if (d.data().productId > max) max = d.data().productId;
      });
      setNextId(max + 1);
    };
    getNextProductId();
  }, []);

  const addProduct = async () => {
    if (!productName || !unit || !openingQty || !openingCost) {
      Alert.alert("Error", "Fill all fields");
      return;
    }

    try {
      setLoading(true);

      const qtyNum = Number(openingQty);
      const costNum = Number(openingCost);

      // ✅ FIXED: inventoryValue added
      const productRef = await addDoc(collection(db, "products"), {
        productId: nextId,
        name: productName.trim(),
        unit: unit.trim(),
        stock: qtyNum,
        inventoryValue: qtyNum * costNum,   // 🔥 IMPORTANT FIX
        createdAt: serverTimestamp()
      });

      // Opening purchase record
      await addDoc(collection(db, "purchases"), {
        productId: productRef.id,
        productName: productName.trim(),
        qtyPurchased: qtyNum,
        qtyRemaining: qtyNum,
        costPerUnit: costNum,
        createdAt: serverTimestamp(),
        type: "opening"
      });

      Alert.alert("Success", "Product added 🎉");

      setProductName("");
      setUnit("");
      setOpeningQty("");
      setOpeningCost("");
      setNextId(prev => prev + 1);

    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Text style={styles.heading}>Add Product</Text>

      <View style={styles.card}>
        <Text style={styles.idText}>Product ID: {nextId}</Text>

        <TextInput
          style={styles.input}
          placeholder="Product Name"
          value={productName}
          onChangeText={setProductName}
        />

        <TextInput
          style={styles.input}
          placeholder="Unit"
          value={unit}
          onChangeText={setUnit}
        />

        <TextInput
          style={styles.input}
          placeholder="Opening Quantity"
          keyboardType="numeric"
          value={openingQty}
          onChangeText={setOpeningQty}
        />

        <TextInput
          style={styles.input}
          placeholder="Opening Cost per Unit"
          keyboardType="numeric"
          value={openingCost}
          onChangeText={setOpeningCost}
        />

        <TouchableOpacity onPress={addProduct} disabled={loading}>
          <LinearGradient
            colors={["#5cf673", "#48ec71"]}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Add Product"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  heading: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  idText: { fontSize: 14, marginBottom: 10 },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    marginTop: 10
  },
  button: {
    marginTop: 20,
    padding: 15,
    borderRadius: 15,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" }
});