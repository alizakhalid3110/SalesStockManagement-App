import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function ProfitScreen() {
  const [todayProfit, setTodayProfit] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const unsubscribeSales = onSnapshot(
      query(collection(db, "sales")),
      snap => {
        let today = 0;
        let month = 0;
        let total = 0;

        snap.forEach(d => {
          const data = d.data();
          const date = data.createdAt?.toDate?.();
          const profit = Number(data.profit || 0);
          if (!date) return;

          total += profit;
          if (date >= startOfToday) today += profit;
          if (date >= startOfMonth) month += profit;
        });

        setTodayProfit(today);
        setMonthlyProfit(month);
        setTotalProfit(total);
      }
    );

    const unsubscribeExpense = onSnapshot(
      query(collection(db, "expenses")),
      snap => {
        let today = 0;
        let month = 0;
        let total = 0;

        snap.forEach(d => {
          const data = d.data();
          const date = data.createdAt?.toDate?.();
          const amt = Number(data.amount || 0);
          if (!date) return;

          total += amt;
          if (date >= startOfToday) today += amt;
          if (date >= startOfMonth) month += amt;
        });

        setTodayExpense(today);
        setMonthlyExpense(month);
        setTotalExpense(total);
      }
    );

    return () => {
      unsubscribeSales();
      unsubscribeExpense();
    };
  }, []);

  return (
    <ImageBackground
      source={{
        uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRl3KMNaims2kSdjnM8jSnxOx1JalkshsMLyA&s"
      }}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>

          <Text style={styles.heading}>Profit Overview</Text>
          <Text style={styles.subHeading}>Business performance summary</Text>

          {/* TODAY */}
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Today</Text>
            <Text style={styles.mainAmount}>
              Rs {todayProfit - todayExpense}
            </Text>
          </View>

          {/* MONTH */}
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>This Month</Text>
            <Text style={[styles.mainAmount, { color: "#2563eb" }]}>
              Rs {monthlyProfit - monthlyExpense}
            </Text>
          </View>

          {/* TOTAL */}
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Total Profit Till Now</Text>
            <Text style={[styles.mainAmount, { color: "#7c3aed" }]}>
              Rs {totalProfit - totalExpense}
            </Text>

            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: "700" }}>
                Total Profit: Rs {totalProfit}
              </Text>
              <Text style={{ fontWeight: "700", color: "red" }}>
                Total Expense: Rs {totalExpense}
              </Text>
            </View>
          </View>

        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  container: { padding: 20, paddingBottom: 60 },

  heading: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    marginTop: 40
  },

  subHeading: {
    fontSize: 14,
    color: "#e5e7eb",
    textAlign: "center",
    marginBottom: 20
  },

  glassCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827"
  },

  mainAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: "#16a34a",
    textAlign: "center",
    marginVertical: 12
  }
});