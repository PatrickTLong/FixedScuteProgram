import React, { memo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import MembershipContent from '../components/MembershipContent';

function MembershipScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <MembershipContent />
    </SafeAreaView>
  );
}

export default memo(MembershipScreen);
