import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth, navigationRef } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import InfoModal from './src/components/InfoModal';
import EmergencyTapoutModal from './src/components/EmergencyTapoutModal';

function GlobalModals() {
  const {
    modalState,
    closeModal,
    emergencyTapoutModalVisible,
    setEmergencyTapoutModalVisible,
    handleUseEmergencyTapout,
    activePresetForTapout,
    tapoutStatus,
    tapoutLoading,
    lockEndsAtForTapout,
  } = useAuth();

  return (
    <>
      <InfoModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        onClose={closeModal}
      />
      <EmergencyTapoutModal
        visible={emergencyTapoutModalVisible}
        onClose={() => setEmergencyTapoutModalVisible(false)}
        onUseTapout={handleUseEmergencyTapout}
        presetAllowsTapout={!!activePresetForTapout?.allowEmergencyTapout}
        tapoutsRemaining={tapoutStatus?.remaining ?? 0}
        isLoading={tapoutLoading}
        lockEndsAt={lockEndsAtForTapout}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
          <GlobalModals />
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;
