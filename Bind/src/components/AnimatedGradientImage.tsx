import React, { useEffect, useRef, memo } from 'react';
import { Animated, View, Image, StyleSheet, ImageSourcePropType, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useTheme } from '../context/ThemeContext';

interface Props {
  source: ImageSourcePropType;
  width: number;
  height: number;
  glow?: boolean;
}

function AnimatedGradientImage({ source, width, height, glow = false }: Props) {
  const { theme } = useTheme();
  const glowOpacity = theme === 'light' ? 0.3 : 0.6;
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

  const gradientTranslate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, 0],
  });

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow layer behind the image */}
      {glow && (
        <Animated.Image
          source={source}
          style={{
            position: 'absolute',
            width: width * 1.04,
            height: height * 1.04,
            tintColor: '#22c55e',
            opacity: glowOpacity,
            ...(Platform.OS === 'android' ? {} : {
              shadowColor: '#22c55e',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 15,
            }),
          }}
          resizeMode="contain"
          blurRadius={Platform.OS === 'android' ? 8 : 10}
        />
      )}
      <MaskedView
        style={{ width, height }}
        maskElement={
          <Image
            source={source}
            style={{ width, height }}
            resizeMode="contain"
          />
        }
      >
        <View style={[styles.gradientContainer, { width, height }]}>
          <Animated.View
            style={[
              styles.animatedGradient,
              { transform: [{ translateX: gradientTranslate }] },
            ]}
          >
            <LinearGradient
              colors={[
                '#22c55e', // green
                '#4ade80', // bright light green
                '#22c55e', // green
                '#bbf7d0', // very light green (high contrast)
                '#22c55e', // green
                '#4ade80', // bright light green
                '#22c55e', // green
                '#bbf7d0', // very light green (high contrast)
                '#22c55e', // green
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradient, { width: width * 2 }]}
            />
          </Animated.View>
        </View>
      </MaskedView>
    </View>
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
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
  },
});

export default memo(AnimatedGradientImage);
