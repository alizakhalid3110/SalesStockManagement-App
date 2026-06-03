import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// 🔹 Screens
import AddProductScreen from "./MyAccounts/AddProduct";
import StockListScreen from "./MyAccounts/StockListScreen";
import AddPurchaseScreen from "./MyAccounts/AddPurchaseScreen";
import AddSaleScreen from "./MyAccounts/AddSaleScreen";
import ExpenseScreen from "./MyAccounts/ExpenseScreen";
import ProfitScreen from "./MyAccounts/ProfitScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,

          tabBarActiveTintColor: "#2E7D32",
          tabBarInactiveTintColor: "#757575",

          tabBarStyle: {
            height: 65,
            paddingBottom: 8,
            paddingTop: 6,
            elevation: 8,
            backgroundColor: "#ffffff",
            borderTopWidth: 0,
            height:95
          },

          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },

          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            let IconComponent = Ionicons;

            switch (route.name) {
              case "Add Product":
                iconName = focused
                  ? "add-circle"
                  : "add-circle-outline";
                break;

              case "Stock":
                iconName = focused
                  ? "layers"
                  : "layers-outline";
                break;

              case "Purchase":
                iconName = focused
                  ? "cart"
                  : "cart-outline";
                break;

              case "Sales":
                iconName = focused
                  ? "trending-up"
                  : "trending-up-outline";
                break;

              case "Expense":
                IconComponent = MaterialCommunityIcons;
                iconName = "cash-minus";
                break;

              case "Profit":
                IconComponent = MaterialCommunityIcons;
                iconName = "cash-plus";
                break;
            }

            return (
              <IconComponent
                name={iconName}
                size={size}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Add Product" component={AddProductScreen} />
        <Tab.Screen name="Stock" component={StockListScreen} />
        <Tab.Screen name="Purchase" component={AddPurchaseScreen} />
        <Tab.Screen name="Sales" component={AddSaleScreen} />
        <Tab.Screen name="Expense" component={ExpenseScreen} />
        <Tab.Screen name="Profit" component={ProfitScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
