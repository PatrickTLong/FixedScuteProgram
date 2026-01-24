import React, { useRef, useEffect } from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import LottieView from 'lottie-react-native';

const Lottie = LottieView as any;

interface LottieToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'default';
}

// Frame segments from the markers we added:
// turnOff: starts at frame 14, duration 15 (frames 14-29)
// turnOn: starts at frame 73, duration 15 (frames 73-88)
const TURN_OFF_SEGMENT: [number, number] = [14, 29];
const TURN_ON_SEGMENT: [number, number] = [73, 88];

// Static frames for initial render (end frames of each state)
const OFF_FRAME = 29;
const ON_FRAME = 88;

// Size configurations
const SIZES = {
  default: {
    containerWidth: 56,
    containerHeight: 34,
    lottieSize: 90,
  },
  small: {
    containerWidth: 44,
    containerHeight: 27,
    lottieSize: 70,
  },
};

export default function LottieToggle({
  value,
  onValueChange,
  disabled = false,
  size = 'default',
}: LottieToggleProps) {
  const lottieRef = useRef<any>(null);
  const isFirstRender = useRef(true);
  const prevValue = useRef(value);

  const { containerWidth, containerHeight, lottieSize } = SIZES[size];

  useEffect(() => {
    if (isFirstRender.current) {
      // On first render, just show the correct static frame
      isFirstRender.current = false;
      if (lottieRef.current) {
        // Go to the end frame of the appropriate state
        const frame = value ? ON_FRAME : OFF_FRAME;
        lottieRef.current.play(frame, frame);
      }
      return;
    }

    // Only animate when value actually changes
    if (prevValue.current !== value && lottieRef.current) {
      const segment = value ? TURN_ON_SEGMENT : TURN_OFF_SEGMENT;
      lottieRef.current.play(segment[0], segment[1]);
    }
    prevValue.current = value;
  }, [value]);

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress} disabled={disabled}>
      <View
        style={{
          width: containerWidth,
          height: containerHeight,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Lottie
          ref={lottieRef}
          source={require('../frontassets/On And Off Toggle Switch Button.json')}
          style={{
            width: lottieSize,
            height: lottieSize,
          }}
          autoPlay={false}
          loop={false}
          speed={2}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
