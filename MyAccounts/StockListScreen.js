import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";

export default function StockListScreen() {
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]); // 🔥 NEW
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");

  /* ================= FETCH PRODUCTS ================= */

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("productId", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(list);
    });

    return () => unsubscribe();
  }, []);

  /* ================= FETCH PURCHASES ================= */

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "purchases"), (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setPurchases(list);
    });

    return () => unsubscribe();
  }, []);

  /* ================= TOTAL CALCULATIONS ================= */

  const totalQuantity = useMemo(() => {
    return products.reduce((sum, item) => {
      return sum + Number(item.stock || 0);
    }, 0);
  }, [products]);

  // 🔥 ONLY TOTAL AMOUNT DYNAMICALLY FROM PURCHASES
  const totalInventoryValue = useMemo(() => {
    return purchases.reduce((sum, item) => {
      return (
        sum +
        Number(item.qtyRemaining || 0) *
          Number(item.costPerUnit || 0)
      );
    }, 0);
  }, [purchases]);

  /* ================= EDIT ================= */

  const openEdit = (item) => {
    setSelectedProduct(item);
    setName(item.name);
    setUnit(item.unit);
    setStock(String(item.stock));
    setModalVisible(true);
  };

  const updateProduct = async () => {
    if (!name || !unit || stock === "") {
      Alert.alert("Error", "All fields required");
      return;
    }

    try {
      await updateDoc(doc(db, "products", selectedProduct.id), {
        name: name.trim(),
        unit: unit.trim(),
        stock: Number(stock)
      });
      setModalVisible(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const deleteProduct = (id) => {
    Alert.alert("Delete Product", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "products", id));
        }
      }
    ]);
  };

  return (
    <LinearGradient
      colors={["#d9ef59", "#74eb5f"]}
      style={styles.container}
    >
      <Text style={styles.heading}>📦 Stock Overview</Text>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.unit}>Unit: {item.unit}</Text>
            </View>

            <View style={styles.right}>
              <Text
                style={[
                  styles.stock,
                  item.stock <= 0 && { color: "#ff4d4f" }
                ]}
              >
                {item.stock}
              </Text>

              {/* 🔥 PER PRODUCT VALUE SAME RAKHA */}
              <Text style={styles.value}>
                Rs {item.inventoryValue || 0}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEdit(item)}
                >
                  <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={() => deleteProduct(item.id)}
                >
                  <Text style={styles.btnText}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* ===== TOTAL SUMMARY CARD ===== */}

      <View style={styles.totalBox}>
        <Text style={styles.totalText}>
          Total Quantity: {totalQuantity}
        </Text>

        {/* 🔥 ONLY THIS TOTAL UPDATED */}
        <Text style={styles.totalText}>
          Total Amount: Rs {totalInventoryValue}
        </Text>
      </View>

      {/* EDIT MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Product</Text>

            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Unit"
              value={unit}
              onChangeText={setUnit}
            />

            <TextInput
              style={styles.input}
              placeholder="Stock"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={updateProduct}
              >
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
    marginTop: 25
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  name: { fontSize: 17, fontWeight: "700" },
  unit: { fontSize: 13, color: "#666", marginTop: 2 },
  right: { alignItems: "center" },
  stock: { fontSize: 20, fontWeight: "800" },
  value: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  actions: { flexDirection: "row", marginTop: 6 },
  editBtn: {
    backgroundColor: "#74eb5f",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6
  },
  delBtn: {
    backgroundColor: "#ff4d4f",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8
  },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  totalBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#065f46",
    padding: 16
  },
  totalText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCard: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center"
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10
  },
  saveBtn: {
    backgroundColor: "#6a5af9",
    padding: 12,
    borderRadius: 10,
    width: "48%",
    alignItems: "center"
  },
  cancelBtn: {
    backgroundColor: "#9ca3af",
    padding: 12,
    borderRadius: 10,
    width: "48%",
    alignItems: "center"
  }
});