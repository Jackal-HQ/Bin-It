// Small entrance-animation wrapper built on Moti (Reanimated). Fades a block up into
// place; pass `delay` to stagger a sequence of them. Keeps animation config in one spot.
import { MotiView } from "moti";
import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";

export function FadeInUp({
  children,
  delay = 0,
  distance = 12,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: distance }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 320, delay }}
      style={style}
    >
      {children}
    </MotiView>
  );
}
