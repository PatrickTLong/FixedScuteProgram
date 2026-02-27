import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { colors } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size, color = colors.text, fullScreen = false }: LoadingSpinnerProps) {
  const { s } = useResponsive();
  const baseSize = size ?? s(32);
  const dotSize = Math.max(4, Math.round(baseSize * 0.22));
  const dotGap = Math.max(3, Math.round(baseSize * 0.15));
  const bounce = Math.max(4, Math.round(baseSize * 0.2));

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dots = [dot1, dot2, dot3];
    const loops: Animated.CompositeAnimation[] = [];

    dots.forEach((dot, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -bounce, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loops.push(loop);
      loop.start();
    });

    return () => loops.forEach(l => l.stop());
  }, [dot1, dot2, dot3, bounce]);

  const dots = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: dotGap, height: baseSize, width: baseSize }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            transform: [{ translateY: dot }],
          }}
        />
      ))}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        {dots}
      </View>
    );
  }

  return dots;
}
