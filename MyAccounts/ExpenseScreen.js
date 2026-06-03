import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

export default function ExpenseScreen() {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");

  const [allExpenses, setAllExpenses] = useState([]);
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);

  const [showAll, setShowAll] = useState(false);
  const [openMonth, setOpenMonth] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      let all = [];
      let todayList = [];
      let todaySum = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      snap.forEach((d) => {
        const data = d.data();
        const date = data.createdAt?.toDate?.();
        if (!date) return;

        const obj = { id: d.id, ...data, date };
        all.push(obj);

        if (date >= today) {
          todayList.push(obj);
          todaySum += Number(data.amount || 0);
        }
      });

      setAllExpenses(all);
      setTodayExpenses(todayList);
      setTodayTotal(todaySum);
    });

    return unsub;
  }, []);

  const saveExpense = async () => {
    const amtNum = Number(amount);
    if (!title || !amtNum) {
      Alert.alert("Error", "Title & amount required");
      return;
    }

    await addDoc(collection(db, "expenses"), {
      title,
      amount: amtNum,
      category,
      createdAt: serverTimestamp(),
    });

    setTitle("");
    setAmount("");
    setCategory("Other");
    Alert.alert("Success", "Expense Added");
  };

  const deleteExpense = async (id) => {
    await deleteDoc(doc(db, "expenses", id));
  };

  const deleteAllExpenses = async () => {
    Alert.alert("Delete All", "Delete all expenses?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const snap = await getDocs(collection(db, "expenses"));
          for (let d of snap.docs) {
            await deleteDoc(doc(db, "expenses", d.id));
          }
          setOpenMonth(null);
        },
      },
    ]);
  };

  // Group by Month
  const months = {};
  allExpenses.forEach((item) => {
    const month = item.date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    if (!months[month]) months[month] = [];
    months[month].push(item);
  });

  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1554224155-6726b3ff858f",
      }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.heading}>Expense Manager</Text>

          {/* ADD EXPENSE */}
          <View style={styles.card}>
            <TextInput
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />
            <TextInput
              placeholder="Amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
            />
            <Picker selectedValue={category} onValueChange={setCategory}>
              <Picker.Item label="Rent" value="Rent" />
              <Picker.Item label="Transport" value="Transport" />
              <Picker.Item label="Salary" value="Salary" />
              <Picker.Item label="Electricity" value="Electricity" />
              <Picker.Item label="Other" value="Other" />
            </Picker>

            <TouchableOpacity style={styles.btn} onPress={saveExpense}>
              <Text style={styles.btnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>

          {/* TODAY */}
          {!showAll && (
            <>
              <Text style={styles.section}>Today's Expenses</Text>

              {todayExpenses.map((item) => (
                <View key={item.id} style={styles.item}>
                  <View>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text>{item.category}</Text>
                  </View>

                  <View>
                    <Text style={styles.amount}>Rs {item.amount}</Text>
                    <TouchableOpacity
                      onPress={() => deleteExpense(item.id)}
                    >
                      <Text style={{ color: "red" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.totalBox}>
                <Text style={styles.totalText}>
                  Total Today: Rs {todayTotal}
                </Text>
              </View>
            </>
          )}

          {/* TOGGLE BUTTON */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#2563eb" }]}
            onPress={() => {
              setShowAll(!showAll);
              setOpenMonth(null);
            }}
          >
            <Text style={styles.btnText}>
              {showAll ? "Back to Today" : "View All Expenses"}
            </Text>
          </TouchableOpacity>

          {/* DELETE ALL */}
          {showAll && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "red" }]}
              onPress={deleteAllExpenses}
            >
              <Text style={styles.btnText}>Delete All Expenses</Text>
            </TouchableOpacity>
          )}

          {/* MONTH LIST */}
          {showAll &&
            Object.keys(months).map((month) => {
              const monthTotal = months[month].reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
              );

              return (
                <View key={month}>
                  <TouchableOpacity
                    style={styles.monthBox}
                    onPress={() =>
                      setOpenMonth(openMonth === month ? null : month)
                    }
                  >
                    <Text style={styles.monthText}>{month}</Text>
                    <Text style={{ fontWeight: "bold" }}>
                      Total: Rs {monthTotal}
                    </Text>
                  </TouchableOpacity>

                  {openMonth === month &&
                    months[month].map((item) => (
                      <View key={item.id} style={styles.item}>
                        <View>
                          <Text style={styles.title}>{item.title}</Text>
                          <Text>{item.date.toDateString()}</Text>
                        </View>
                        <Text style={styles.amount}>
                          Rs {item.amount}
                        </Text>
                      </View>
                    ))}
                </View>
              );
            })}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginVertical: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginVertical: 8,
    padding: 10,
    borderRadius: 10,
  },
  btn: {
    backgroundColor: "#16a34a",
    padding: 12,
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  section: {
    fontSize: 20,
    color: "#fff",
    marginVertical: 10,
  },
  item: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginVertical: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "bold",
  },
  amount: {
    fontWeight: "bold",
    color: "red",
  },
  totalBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginVertical: 10,
    alignItems: "center",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  monthBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginVertical: 5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});