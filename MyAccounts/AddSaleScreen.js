import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageBackground
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  serverTimestamp,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase";

export default function AddSaleScreen() {

  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const [todaySales, setTodaySales] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);

  const [allSalesOpen, setAllSalesOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(null);
  const [allSales, setAllSales] = useState({});

  // PRODUCTS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "products"), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const selectedProduct = useMemo(
    () => products.find(p => p.id === productId) || null,
    [productId, products]
  );

  const total = useMemo(
    () => Number(qty || 0) * Number(price || 0),
    [qty, price]
  );

  // TODAY SALES
  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, snap => {
      let sum = 0;
      let profit = 0;
      let list = [];

      snap.forEach(d => {
        const data = d.data();
        if (!data.createdAt) return;

        if (data.createdAt.toDate() >= start) {
          list.push({ id: d.id, ...data });
          sum += data.total || 0;
          profit += data.profit || 0;
        }
      });

      setTodaySales(list);
      setTodayTotal(sum);
      setTodayProfit(profit);
    });

    return unsub;
  }, []);

  // ALL SALES GROUPED
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sales"), snap => {
      let monthWise = {};

      snap.forEach(d => {
        const data = { id: d.id, ...d.data() };
        if (!monthWise[data.month]) {
          monthWise[data.month] = [];
        }
        monthWise[data.month].push(data);
      });

      setAllSales(monthWise);
    });

    return unsub;
  }, []);

  // SAVE SALE
 const saveSale = async () => {

  if (!productId || !qty || !price) {
    Alert.alert("Error", "Fill all fields");
    return;
  }

  const sellQty = Number(qty);
  const salePrice = Number(price);

  if (!selectedProduct) {
    Alert.alert("Error", "Product not found");
    return;
  }

  try {

    const purchaseQuery = query(
      collection(db, "purchases"),
      where("productId", "==", productId),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(purchaseQuery);

    let remaining = sellQty;
    let costTotal = 0;
    let usedPurchases = [];

    for (let d of snap.docs) {

      if (remaining <= 0) break;

      const data = d.data();
      const available = Number(data.qtyRemaining || 0);

      if (available <= 0) continue;

      const used = Math.min(available, remaining);

      costTotal += used * Number(data.costPerUnit || 0);
      remaining -= used;

      usedPurchases.push({
        purchaseId: d.id,
        qtyUsed: used
      });
    }

    // ⚡ IMPORTANT:
    // Agar remaining > 0 hai to bhi sale allow karo
    // Bas uska cost zero maan lo

    // Update purchases
    for (let p of usedPurchases) {
      const ref = doc(db, "purchases", p.purchaseId);
      const purchaseSnap = await getDoc(ref);

      if (purchaseSnap.exists()) {
        const data = purchaseSnap.data();
        await updateDoc(ref, {
          qtyRemaining: (data.qtyRemaining || 0) - p.qtyUsed
        });
      }
    }

    const profit = sellQty * salePrice - costTotal;

    await addDoc(collection(db, "sales"), {
      productId,
      productName: selectedProduct.name,
      quantity: sellQty,
      salePrice,
      total: sellQty * salePrice,
      profit,
      usedPurchases,
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      day: new Date().getDate(),
      createdAt: serverTimestamp()
    });

    // 🔥 STOCK ALWAYS MINUS (even negative)
    await updateDoc(doc(db, "products", productId), {
      stock: (selectedProduct.stock || 0) - sellQty
    });

    setProductId(null);
    setQty("");
    setPrice("");

    Alert.alert("Success", `Profit: Rs ${profit}`);

  } catch (err) {
    Alert.alert("Error", err.message);
  }
};

  // DELETE SINGLE SALE (WITH STOCK RESTORE)
 const deleteSale = async (sale) => {
  Alert.alert("Confirm", "Delete this sale?", [
    { text: "Cancel" },
    {
      text: "Delete",
      onPress: async () => {
        try {

          // 1️⃣ Restore Product Stock
          if (sale.productId && sale.quantity) {
            const productRef = doc(db, "products", sale.productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
              const productData = productSnap.data();

              await updateDoc(productRef, {
                stock: (productData.stock || 0) + sale.quantity
              });
            }
          }

          // 2️⃣ Restore Purchases qtyRemaining (SAFE CHECK)
          if (sale.usedPurchases && sale.usedPurchases.length > 0) {

            for (let p of sale.usedPurchases) {

              if (!p.purchaseId) continue;

              const purchaseRef = doc(db, "purchases", p.purchaseId);
              const purchaseSnap = await getDoc(purchaseRef);

              if (purchaseSnap.exists()) {
                const purchaseData = purchaseSnap.data();

                await updateDoc(purchaseRef, {
                  qtyRemaining:
                    (purchaseData.qtyRemaining || 0) + (p.qtyUsed || 0)
                });
              }
            }
          }

          // 3️⃣ Delete Sale
          await deleteDoc(doc(db, "sales", sale.id));

        } catch (error) {
          Alert.alert("Error", error.message);
        }
      }
    }
  ]);
};

  // CLEAR ALL SALES (NO STOCK CHANGE)
  const clearAllSales = async () => {
    Alert.alert("Warning", "Remove ALL sales? Stock will NOT change.", [
      { text: "Cancel" },
      {
        text: "Remove All",
        onPress: async () => {
          const snap = await getDocs(collection(db, "sales"));
          for (let d of snap.docs) {
            await deleteDoc(doc(db, "sales", d.id));
          }
        }
      }
    ]);
  };

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ImageBackground
        source={{
          uri: "https://twinflowerstudio.com/cdn/shop/collections/PXL_20230424_215121564.PORTRAIT_1024x1024_2x_df27543e-15d5-4cea-9074-98d86bdfab08.webp?v=1746492760"
        }}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

            <Text style={styles.screenTitle}>Sales Dashboard</Text>

            {/* ADD SALE CARD */}
            <View style={styles.glassCard}>
              <Text style={styles.cardTitle}>Add New Sale</Text>

              <View style={styles.pickerWrapper}>
                <Picker selectedValue={productId} onValueChange={setProductId}>
                  <Picker.Item label="Select Product" value={null} />
                  {products.map(p => (
                    <Picker.Item
                      key={p.id}
                      label={`${p.name} • Stock ${p.stock || 0}`}
                      value={p.id}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.row}>
                <TextInput
                  style={styles.input}
                  placeholder="Quantity"
                  keyboardType="numeric"
                  value={qty}
                  onChangeText={setQty}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Sale Price"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs {total}</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={saveSale}>
                <Text style={styles.primaryBtnText}>Save Sale</Text>
              </TouchableOpacity>
            </View>

            {/* ALL SALES SECTION */}
            <View style={styles.glassCard}>
              <TouchableOpacity onPress={()=>setAllSalesOpen(!allSalesOpen)}>
                <Text style={styles.cardTitle}>All Sales</Text>
              </TouchableOpacity>

              {allSalesOpen && (
                <>
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={clearAllSales}
                  >
                    <Text style={{color:"#fff",fontWeight:"800"}}>
                      Clear All Sales
                    </Text>
                  </TouchableOpacity>

                  {Object.keys(allSales).map(m=>{
                    const monthProfit = allSales[m].reduce((sum,i)=>sum+(i.profit||0),0);

                    return(
                      <View key={m}>
                        <TouchableOpacity
                          style={styles.monthHeader}
                          onPress={()=>setMonthOpen(monthOpen==m?null:m)}
                        >
                          <Text style={styles.monthText}>
                            {monthNames[m]}
                          </Text>
                          <Text style={{fontWeight:"900",color:"#166534"}}>
                            Profit: Rs {monthProfit}
                          </Text>
                        </TouchableOpacity>

                        {monthOpen==m && allSales[m].map(s=>(
                          <View key={s.id} style={styles.saleItem}>
                            <View>
                              <Text style={styles.saleName}>{s.productName}</Text>
                              <Text style={styles.saleQty}>
                                {s.day}/{Number(m)+1}/{s.year}
                              </Text>
                            </View>
                            <View style={{alignItems:"flex-end"}}>
                              <Text style={styles.saleAmount}>Rs {s.total}</Text>
                              <TouchableOpacity onPress={()=>deleteSale(s)}>
                                <Text style={{color:"red",fontWeight:"700"}}>
                                  Delete
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )
                  })}
                </>
              )}
            </View>

          </ScrollView>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg:{flex:1},
  overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.28)"},
  container:{padding:16,paddingBottom:60},
  screenTitle:{fontSize:26,fontWeight:"900",color:"#f0fdf4",marginTop:15},
  glassCard:{backgroundColor:"rgba(255,255,255,0.75)",borderRadius:22,padding:18,marginBottom:20},
  cardTitle:{fontSize:18,fontWeight:"900",color:"#064e3b",marginBottom:10},
  pickerWrapper:{backgroundColor:"#fff",borderRadius:14,marginBottom:10},
  row:{flexDirection:"row",justifyContent:"space-between"},
  input:{width:"48%",backgroundColor:"#fff",borderRadius:14,padding:12},
  totalBox:{flexDirection:"row",justifyContent:"space-between",marginVertical:12},
  totalLabel:{fontWeight:"700"},
  totalValue:{fontWeight:"900",fontSize:18},
  primaryBtn:{backgroundColor:"#16a34a",paddingVertical:14,borderRadius:18,alignItems:"center"},
  primaryBtnText:{color:"#fff",fontWeight:"900",fontSize:16},
  saleItem:{backgroundColor:"#fff",borderRadius:18,padding:14,marginBottom:10,flexDirection:"row",justifyContent:"space-between"},
  saleName:{fontWeight:"800"},
  saleQty:{color:"#374151"},
  saleAmount:{fontWeight:"900"},
  monthHeader:{paddingVertical:12,flexDirection:"row",justifyContent:"space-between"},
  monthText:{fontWeight:"900",fontSize:16,color:"#065f46"},
  clearBtn:{backgroundColor:"#b91c1c",padding:12,borderRadius:14,alignItems:"center",marginBottom:10}
});