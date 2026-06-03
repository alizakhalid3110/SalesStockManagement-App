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
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  getDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase";

export default function AddPurchaseScreen() {

  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const [todayPurchases, setTodayPurchases] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);

  const [allPurchasesOpen, setAllPurchasesOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(null);
  const [allPurchases, setAllPurchases] = useState({});

  /* ================= PRODUCTS ================= */
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

  /* ================= TODAY PURCHASES ================= */
  useEffect(() => {
    const start = new Date();
    start.setHours(0,0,0,0);

    const unsub = onSnapshot(collection(db,"purchases"), snap=>{
      let list = [];
      let sum = 0;

      snap.forEach(d=>{
        const data = { id:d.id, ...d.data() };
        const date = data.createdAt?.toDate?.();
        if(!date) return;

        if(date >= start){
          list.push(data);
          sum += (data.qtyPurchased || 0) * (data.costPerUnit || 0);
        }
      });

      setTodayPurchases(list);
      setTodayTotal(sum);
    });

    return unsub;
  },[]);

  /* ================= ALL PURCHASES GROUPED ================= */
  useEffect(()=>{
    const unsub = onSnapshot(collection(db,"purchases"), snap=>{
      let monthWise = {};

      snap.forEach(d=>{
        const data = { id:d.id, ...d.data() };
        const date = data.createdAt?.toDate?.();
        if(!date) return;

        const month = date.getMonth();
        if(!monthWise[month]) monthWise[month] = [];
        monthWise[month].push(data);
      });

      setAllPurchases(monthWise);
    });

    return unsub;
  },[]);

  /* ================= SAVE PURCHASE ================= */
  const savePurchase = async () => {

    if(!productId || !qty || !price){
      Alert.alert("Error","Fill all fields");
      return;
    }

    const qtyNum = Number(qty);
    const priceNum = Number(price);

    try{

      await addDoc(collection(db,"purchases"),{
        productId,
        productName:selectedProduct?.name || "Unknown",
        qtyPurchased:qtyNum,
        qtyRemaining:qtyNum,
        costPerUnit:priceNum,
        month:new Date().getMonth(),
        year:new Date().getFullYear(),
        day:new Date().getDate(),
        createdAt:serverTimestamp()
      });

   await updateDoc(doc(db,"products",productId),{
  stock:(selectedProduct?.stock || 0) + qtyNum,
  inventoryValue:(selectedProduct?.inventoryValue || 0) + (qtyNum * priceNum)
});

      setProductId(null);
      setQty("");
      setPrice("");

      Alert.alert("Success","Purchase Added");

    }catch(err){
      Alert.alert("Error",err.message);
    }
  };

  /* ================= DELETE PURCHASE ================= */
 const deletePurchase = async (purchase)=>{

  Alert.alert("Confirm","Delete this purchase?",[
    {text:"Cancel"},
    {
      text:"Delete",
      onPress:async()=>{

        const productRef = doc(db,"products",purchase.productId);
        const productSnap = await getDoc(productRef);
        const productData = productSnap.data();

        await updateDoc(productRef,{
          stock:(productData.stock || 0) - purchase.qtyPurchased,
          inventoryValue:(productData.inventoryValue || 0) - (purchase.qtyPurchased * purchase.costPerUnit)
        });

        await deleteDoc(doc(db,"purchases",purchase.id));
      }
    }
  ]);
};

  /* ================= CLEAR ALL ================= */
  const clearAllPurchases = async ()=>{
    Alert.alert("Warning","Remove ALL purchases?",[
      {text:"Cancel"},
      {
        text:"Remove All",
        onPress:async()=>{
          const snap = await getDocs(collection(db,"purchases"));
          for(let d of snap.docs){
            await deleteDoc(doc(db,"purchases",d.id));
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
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
      <ImageBackground
        source={{ uri:"https://pakplants.pk/wp-content/uploads/2024/08/House-Plant-min.png"}}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.container}>

            <Text style={styles.screenTitle}>Purchase Dashboard</Text>

            {/* ADD PURCHASE */}
            <View style={styles.glassCard}>
              <Text style={styles.cardTitle}>Add New Purchase</Text>

              <View style={styles.pickerWrapper}>
                <Picker selectedValue={productId} onValueChange={setProductId}>
                  <Picker.Item label="Select Product" value={null}/>
                  {products.map(p=>(
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
                  placeholder="Cost Per Unit"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs {total}</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={savePurchase}>
                <Text style={styles.primaryBtnText}>Save Purchase</Text>
              </TouchableOpacity>
            </View>

            {/* ALL PURCHASES */}
            <View style={styles.glassCard}>
              <TouchableOpacity onPress={()=>setAllPurchasesOpen(!allPurchasesOpen)}>
                <Text style={styles.cardTitle}>All Purchases</Text>
              </TouchableOpacity>

              {allPurchasesOpen && (
                <>
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={clearAllPurchases}
                  >
                    <Text style={{color:"#fff",fontWeight:"900"}}>
                      Clear All Purchases
                    </Text>
                  </TouchableOpacity>

                  {Object.keys(allPurchases).map(m=>{

                    const monthTotal = allPurchases[m]
                      .reduce((sum,i)=>sum + (i.qtyPurchased*i.costPerUnit),0);

                    return(
                      <View key={m}>
                        <TouchableOpacity
                          style={styles.monthHeader}
                          onPress={()=>setMonthOpen(monthOpen==m?null:m)}
                        >
                          <Text style={styles.monthText}>
                            {monthNames[m]}
                          </Text>
                          <Text style={{fontWeight:"900"}}>
                            Rs {monthTotal}
                          </Text>
                        </TouchableOpacity>

                        {monthOpen==m && allPurchases[m].map(p=>(
                          <View key={p.id} style={styles.saleItem}>
                            <View>
                              <Text style={styles.saleName}>{p.productName}</Text>
                              <Text>
                                {p.day}/{Number(m)+1}/{p.year}
                              </Text>
                            </View>
                            <View style={{alignItems:"flex-end"}}>
                              <Text style={styles.saleAmount}>
                                Rs {p.qtyPurchased * p.costPerUnit}
                              </Text>
                              <TouchableOpacity onPress={()=>deletePurchase(p)}>
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
  saleAmount:{fontWeight:"900"},
  monthHeader:{paddingVertical:12,flexDirection:"row",justifyContent:"space-between"},
  monthText:{fontWeight:"900",fontSize:16,color:"#065f46"},
  clearBtn:{backgroundColor:"#b91c1c",padding:12,borderRadius:14,alignItems:"center",marginBottom:10}
});