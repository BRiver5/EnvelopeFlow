import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";

// Сигнатурный виджет EnvelopeFlow — заполняющаяся "пилюля" на каждой
// карточке конверта вместо кольца/доната (те уже заняты Stats-экраном этого
// же приложения и донатами/кольцами других приложений портфеля). Полоса
// растёт от 0 до факта траты за ОДИН проход (не дёргается при каждом
// ререндере — см. зависимость эффекта только от fraction), а цвет
// непрерывно перетекает зелёный→янтарный→акцент по мере приближения и
// выхода за бюджет, а не переключается резким шагом.
export function EnvelopeGauge({ fraction, height = 10 }: { fraction: number; height?: number }) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1.3, fraction));

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [clamped]);

  const fillStyle = useAnimatedStyle(() => {
    const widthFraction = Math.min(1, progress.value);
    const color = interpolateColor(progress.value, [0, 0.7, 1, 1.3], [
      theme.colors.success,
      theme.colors.warning,
      theme.colors.danger,
      theme.colors.danger,
    ]);
    return { width: `${widthFraction * 100}%`, backgroundColor: color };
  });

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: theme.colors.surfaceAlt, overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%", borderRadius: height / 2 }, fillStyle]} />
    </View>
  );
}
