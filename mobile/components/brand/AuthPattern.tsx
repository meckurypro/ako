import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useTheme } from "@/providers/ThemeProvider";

const MOTIFS: ((c: string) => ReactNode)[] = [
  (c) => <><Path d="M15 5 35 25 15 45 35 65 15 85 35 95" stroke={c} fill="none" /><Path d="M65 5 85 25 65 45 85 65 65 85 85 95" stroke={c} fill="none" /></>,
  (c) => <><Circle cx={50} cy={50} r={14} stroke={c} fill="none" /><Circle cx={50} cy={50} r={27} stroke={c} fill="none" /><Circle cx={50} cy={50} r={40} stroke={c} fill="none" /></>,
  (c) => <Path d="M50 8 92 50 50 92 8 50Z" stroke={c} fill="none" />,
  (c) => <Path d="M50 10 90 90H10Z" stroke={c} fill="none" />,
  (c) => <Path d="M50 12 88 88H12Z" fill={c} stroke="none" />,
  (c) => <><Path d="M15 30 50 12 85 30" stroke={c} fill="none" /><Path d="M15 55 50 37 85 55" stroke={c} fill="none" /><Path d="M15 80 50 62 85 80" stroke={c} fill="none" /></>,
  (c) => <><Path d="M50 8v84" stroke={c} fill="none" /><Path d="M50 20 30 8M50 20 70 8M50 40 30 28M50 40 70 28M50 60 30 48M50 60 70 48M50 80 30 68M50 80 70 68" stroke={c} fill="none" /></>,
  (c) => <>{[22, 50, 78].flatMap((cx) => [22, 50, 78].map((cy) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={c} stroke="none" />))}</>,
  (c) => <Path d="M12 12 88 88M88 12 12 88" stroke={c} fill="none" />,
  (c) => <><Path d="M20 25a35 35 0 0 1 0 50" stroke={c} fill="none" /><Path d="M38 33a24 24 0 0 1 0 34" stroke={c} fill="none" /><Path d="M55 40a15 15 0 0 1 0 20" stroke={c} fill="none" /><Circle cx={75} cy={50} r={4} fill={c} stroke="none" /></>,
  (c) => <><Circle cx={50} cy={50} r={10} stroke={c} fill="none" /><Circle cx={50} cy={50} r={22} stroke={c} fill="none" /><Circle cx={50} cy={50} r={34} stroke={c} fill="none" /></>,
  (c) => <Path d="M15 8v84M32 8v84M50 8v84M68 8v84M85 8v84" stroke={c} fill="none" />,
  (c) => <Path d="M8 15h84M8 32h84M8 50h84M8 68h84M8 85h84" stroke={c} fill="none" />,
  (c) => <><Path d="M10 85 22 62 34 85Z" stroke={c} fill="none" /><Path d="M38 85 50 62 62 85Z" stroke={c} fill="none" /><Path d="M66 85 78 62 90 85Z" stroke={c} fill="none" /></>,
];

const CELL = 76;
const ROTATIONS = [0, 90, 180, 270] as const;
const COLS = 7;
const ROWS = 11;

export function AuthPattern({ color, opacity = 0.07 }: { color?: string; opacity?: number }) {
  const { colors } = useTheme();
  const strokeColor = color ?? colors.text;
  const cells = Array.from({ length: ROWS * COLS }, (_, index) => index);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity }]}
    >
      {cells.map((index) => {
        const row = Math.floor(index / COLS);
        const col = index % COLS;
        const motif = MOTIFS[index % MOTIFS.length];
        const rotation = ROTATIONS[(row * 3 + col * 5) % ROTATIONS.length];
        return (
          <Svg key={index} width={CELL} height={CELL} viewBox="0 0 100 100" style={{ position: "absolute", top: row * CELL, left: col * CELL, transform: [{ rotate: `${rotation}deg` }] }}>
            <G strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">{motif(strokeColor)}</G>
          </Svg>
        );
      })}
    </View>
  );
}
