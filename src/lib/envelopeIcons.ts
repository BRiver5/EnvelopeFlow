import {
  ShoppingCart,
  Home,
  Car,
  Utensils,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Plane,
  Gift,
  PiggyBank,
  Zap,
  Wifi,
  Dog,
  Shirt,
  Coffee,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";

export const ENVELOPE_ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  home: Home,
  car: Car,
  utensils: Utensils,
  gamepad: Gamepad2,
  health: HeartPulse,
  education: GraduationCap,
  travel: Plane,
  gift: Gift,
  savings: PiggyBank,
  utilities: Zap,
  internet: Wifi,
  pet: Dog,
  clothing: Shirt,
  coffee: Coffee,
  wallet: Wallet,
};

export const ICON_KEYS = Object.keys(ENVELOPE_ICONS);

export function iconFor(key: string): LucideIcon {
  return ENVELOPE_ICONS[key] ?? Wallet;
}

// Готовые пресеты "название + иконка" — один тап вместо печати при создании
// типового конверта.
export const ENVELOPE_PRESETS: { name: string; icon: string }[] = [
  { name: "Groceries", icon: "shopping-cart" },
  { name: "Rent", icon: "home" },
  { name: "Transport", icon: "car" },
  { name: "Dining Out", icon: "utensils" },
  { name: "Entertainment", icon: "gamepad" },
  { name: "Health", icon: "health" },
  { name: "Education", icon: "education" },
  { name: "Travel", icon: "travel" },
  { name: "Gifts", icon: "gift" },
  { name: "Savings", icon: "savings" },
  { name: "Utilities", icon: "utilities" },
  { name: "Internet", icon: "internet" },
  { name: "Pet", icon: "pet" },
  { name: "Clothing", icon: "clothing" },
];
