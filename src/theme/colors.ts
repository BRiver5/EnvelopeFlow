// Палитра приложения. Это единственный файл, где должны жить цветовые значения —
// компоненты и экраны берут цвета только отсюда, магические hex-коды в JSX запрещены.
//
// ВАЖНО: при старте нового приложения из шаблона поменяй accent (и, если нужно,
// background/surface) на свои — дизайн не должен повторяться от приложения к приложению,
// даже если тема совпадает.

// Акцент #849325 — приглушённое старое золото/латунь (hue ~68°), выбрано по
// DESIGN_REGISTRY.md: ближайшие соседи по оттенку — BreathEasy (45°, тёплое
// золото, 23° в сторону) и PantryMatch (96°, оливковый, 28° в другую) — этот
// тон сидит ровно в разрыве между ними, плюс заметно темнее/приглушённее
// обоих. onAccent — тёмные чернила, не белый: белый на этом акценте даёт
// контраст ~3.4:1 (не проходит WCAG AA для обычного текста), тёмный даёт ~6.2:1.
export const light = {
  background: "#F7F6EC",
  backgroundAlt: "#F1EFDF",
  surface: "#FFFFFF",
  surfaceAlt: "#ECE9D6",
  border: "#E0DCC4",
  ink: "#26220F",
  inkMuted: "#6E6650",
  inkFaint: "#A79F86",
  onAccent: "#211D0C",
  accent: "#849325",
  danger: "#C9433F",
  warning: "#C9922B",
  success: "#2E9E5B",
};

export const dark = {
  background: "#17150C",
  backgroundAlt: "#1D1A10",
  surface: "#242014",
  surfaceAlt: "#2C2818",
  border: "#39331E",
  ink: "#F2EFE2",
  inkMuted: "#B3AC93",
  inkFaint: "#716B55",
  onAccent: "#211D0C",
  accent: "#A4B541",
  danger: "#E0635F",
  warning: "#D9A84D",
  success: "#3FBE79",
};

export type Palette = typeof light;
