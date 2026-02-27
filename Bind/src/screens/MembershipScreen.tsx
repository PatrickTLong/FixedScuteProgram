import React, { memo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import MembershipContent from '../components/MembershipContent';
import ScreenTransition from '../components/ScreenTransition';

function MembershipScreen() {
  const { colors } = useTheme();

  return (
    <ScreenTransition>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <MembershipContent />
    </SafeAreaView>
    </ScreenTransition>
  );
}

export default memo(MembershipScreen);
