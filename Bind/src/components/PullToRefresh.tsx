import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';

const PULL_THRESHOLD = 60;
const MAX_PULL = 80;
const DOT_SIZE = 7;
const MAX_DOT_TRAVEL = 30;

interface PullToRefreshProps {
  onRefresh: () => void;
  refreshing: boolean;
  children: React.ReactNode;
}

function PullToRefresh({ onRefresh, refreshing, children }: PullToRefreshProps) {
  const { colors } = useTheme();

  const pullDistance = useSharedValue(0);
  const isRefreshing = useSharedValue(false);
  const dotOpacity = useSharedValue(0);
  const dotScale = useSharedValue(0);
  const dotTranslateY = useSharedValue(0);
  const isAtTop = useSharedValue(true);

  // Watch refreshing prop to animate out when done
  useEffect(() => {
    if (!refreshing && isRefreshing.value) {
      isRefreshing.value = false;
      dotOpacity.value = withTiming(0, { duration: 250 });
      dotScale.value = withTiming(0, { duration: 250 });
      dotTranslateY.value = withTiming(0, { duration: 250 });
    }
  }, [refreshing]);

  const triggerRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isAtTop.value || isRefreshing.value) return;
      if (event.translationY < 0) return;

      const pull = Math.min(event.translationY, MAX_PULL);
      pullDistance.value = pull;
      dotOpacity.value = interpolate(pull, [0, PULL_THRESHOLD * 0.5, PULL_THRESHOLD], [0, 0.4, 1], Extrapolation.CLAMP);
      dotScale.value = interpolate(pull, [0, PULL_THRESHOLD], [0.3, 1], Extrapolation.CLAMP);
      dotTranslateY.value = interpolate(pull, [0, MAX_PULL], [0, MAX_DOT_TRAVEL], Extrapolation.CLAMP);
    })
    .onEnd(() => {
      if (isRefreshing.value) return;

      if (pullDistance.value >= PULL_THRESHOLD) {
        isRefreshing.value = true;
        dotOpacity.value = 1;
        dotScale.value = withRepeat(
          withSequence(
            withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        );
        runOnJS(triggerRefresh)();
      } else {
        dotOpacity.value = withTiming(0, { duration: 150 });
        dotScale.value = withTiming(0, { duration: 150 });
        dotTranslateY.value = withTiming(0, { duration: 150 });
      }
      pullDistance.value = 0;
    })
    .activeOffsetY(15)
    .failOffsetY(-5)
    .failOffsetX([-15, 15]);

  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    isAtTop.value = y <= 1;
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ translateY: dotTranslateY.value }, { scale: dotScale.value }],
  }));

  // Clone child to inject onScroll and scrollEventThrottle
  const child = React.Children.only(children) as React.ReactElement<any>;
  const originalOnScroll = child.props.onScroll;
  const enhancedChild = React.cloneElement(child, {
    onScroll: (event: any) => {
      handleScroll(event);
      if (originalOnScroll) originalOnScroll(event);
    },
    scrollEventThrottle: child.props.scrollEventThrottle || 16,
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={styles.container}>
        <Animated.View style={[styles.dotContainer, dotStyle]}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.text }]} />
        </Animated.View>
        {enhancedChild}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dotContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});

export default PullToRefresh;
