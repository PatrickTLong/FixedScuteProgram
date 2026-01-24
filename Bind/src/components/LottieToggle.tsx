import React, { useRef, useEffect } from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import LottieView from 'lottie-react-native';

const Lottie = LottieView as any;

interface LottieToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

// Frame segments from the markers we added:
// turnOff: starts at frame 14, duration 15 (frames 14-29)
// turnOn: starts at frame 73, duration 15 (frames 73-88)
const TURN_OFF_SEGMENT: [number, number] = [14, 29];
const TURN_ON_SEGMENT: [number, number] = [73, 88];

// Static frames for initial render (end frames of each state)
const OFF_FRAME = 29;
const ON_FRAME = 88;

// Container size (what affects layout) - matches old AnimatedSwitch "large" size
const CONTAINER_WIDTH = 56;
const CONTAINER_HEIGHT = 34;

// Lottie animation size - the toggle shape in the 500x500 canvas is roughly 310x170
// We scale it so the visible toggle is approximately 56x30 (similar to old switch)
const LOTTIE_SIZE = 90;

export default function LottieToggle({
  value,
  onValueChange,
  disabled = false,
}: LottieToggleProps) {
  const lottieRef = useRef<any>(null);
  const isFirstRender = useRef(true);
  const prevValue = useRef(value);

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
          width: CONTAINER_WIDTH,
          height: CONTAINER_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Lottie
          ref={lottieRef}
          source={require('../frontassets/On And Off Toggle Switch Button.json')}
          style={{
            width: LOTTIE_SIZE,
            height: LOTTIE_SIZE,
          }}
          autoPlay={false}
          loop={false}
          speed={2}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
