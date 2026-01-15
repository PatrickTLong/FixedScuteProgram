import React, { useEffect, useRef, memo } from 'react';
import { Animated, Text, View, StyleSheet, TextStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface Props {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  glow?: boolean;
  style?: TextStyle;
}

// Gradient width - must be wide enough to cover the text at all times during animation
const GRADIENT_WIDTH = 800;

function AnimatedGradientText({ text, fontSize = 30, fontFamily = 'Nunito-Bold', glow = false, style }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  // Animate the gradient position so colors slide across the text
  // Start at -GRADIENT_WIDTH/3 and move to 0, keeping text always covered
  const gradientTranslate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [-GRADIENT_WIDTH / 3, 0],
  });

  const textStyle: TextStyle = {
    fontSize,
    fontFamily,
    ...style,
  };

  const glowStyle = glow ? {
    textShadowColor: '#00E5CC',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  } : {};

  return (
    <MaskedView
      maskElement={
        <Text style={[textStyle, glowStyle]}>{text}</Text>
      }
    >
      <View style={styles.gradientContainer}>
        <Animated.View
          style={[
            styles.animatedGradient,
            { transform: [{ translateX: gradientTranslate }] },
          ]}
        >
          <LinearGradient
            colors={[
              '#00D4FF',
              '#00E5CC',
              '#BDFF00',
              '#00E5CC',
              '#00D4FF',
              '#00E5CC',
              '#BDFF00',
              '#00E5CC',
              '#00D4FF',
              '#00E5CC',
              '#BDFF00',
              '#00E5CC',
              '#00D4FF',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, width: GRADIENT_WIDTH }}
          />
        </Animated.View>
        {/* This text sizes the container to match the mask */}
        <Text style={[textStyle, styles.sizer]}>{text}</Text>
      </View>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    overflow: 'hidden',
  },
  animatedGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  sizer: {
    opacity: 0,
  },
});

export default memo(AnimatedGradientText);
