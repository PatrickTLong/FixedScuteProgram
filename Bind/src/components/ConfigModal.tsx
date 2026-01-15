import React, { memo, useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TimerPicker from './TimerPicker';

interface ConfigModalProps {
  visible: boolean;
  configMode: 'all' | 'specific' | null;
  selectedApps: string[];
  blockedWebsites: string[];
  websiteInput: string;
  isWebsiteValid: boolean;
  blockSettings: boolean;
  noTimeLimit: boolean;
  timerDays: number;
  timerHours: number;
  timerMinutes: number;
  onClose: () => void;
  onSave: () => void;
  onOpenAppSelector: () => void;
  onWebsiteInputChange: (text: string) => void;
  onAddWebsite: () => void;
  onRemoveWebsite: (site: string) => void;
  onToggleBlockSettings: () => void;
  onToggleNoTimeLimit: () => void;
  onDaysChange: (value: number) => void;
  onHoursChange: (value: number) => void;
  onMinutesChange: (value: number) => void;
}

function ConfigModal({
  visible,
  configMode,
  selectedApps,
  blockedWebsites,
  websiteInput,
  isWebsiteValid,
  blockSettings,
  noTimeLimit,
  timerDays,
  timerHours,
  timerMinutes,
  onClose,
  onSave,
  onOpenAppSelector,
  onWebsiteInputChange,
  onAddWebsite,
  onRemoveWebsite,
  onToggleBlockSettings,
  onToggleNoTimeLimit,
  onDaysChange,
  onHoursChange,
  onMinutesChange,
}: ConfigModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
        }}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ minWidth: 60 }}
          >
            <Text style={{ color: '#007AFF', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' }}>
            {configMode === 'all' ? 'Disable Phone Use' : 'Select Apps'}
          </Text>
          <TouchableOpacity
            onPress={onSave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ minWidth: 60, alignItems: 'flex-end' }}
          >
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* App Selection Button */}
            {configMode === 'specific' && (
              <TouchableOpacity
                onPress={onOpenAppSelector}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  marginHorizontal: 16,
                  marginTop: 16,
                  backgroundColor: '#fff',
                  borderRadius: 12,
                }}
              >
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#333' }}>Select Apps</Text>
                  <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                    {selectedApps.length === 0 ? 'No apps selected' : `${selectedApps.length} apps selected`}
                  </Text>
                </View>
                <Text style={{ fontSize: 20, color: '#ccc' }}>›</Text>
              </TouchableOpacity>
            )}

            {/* Website Blocking - Only show for specific apps mode */}
            {configMode === 'specific' && (
              <View style={{
                marginHorizontal: 16,
                marginTop: 16,
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 12 }}>Block Websites</Text>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={websiteInput}
                    onChangeText={onWebsiteInputChange}
                    placeholder="e.g. instagram.com"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={{
                      flex: 1,
                      height: 44,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      fontSize: 15,
                      color: '#333',
                      backgroundColor: '#f9f9f9',
                    }}
                  />
                  <TouchableOpacity
                    onPress={onAddWebsite}
                    disabled={!isWebsiteValid}
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: isWebsiteValid ? '#007AFF' : '#ccc',
                      borderRadius: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '400', lineHeight: 28, textAlign: 'center' }}>+</Text>
                  </TouchableOpacity>
                </View>

                {blockedWebsites.length > 0 && (
                  <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {blockedWebsites.map((site) => (
                      <TouchableOpacity
                        key={site}
                        onPress={() => onRemoveWebsite(site)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#e3f2fd',
                          paddingVertical: 6,
                          paddingLeft: 12,
                          paddingRight: 8,
                          borderRadius: 16,
                        }}
                      >
                        <Text style={{ color: '#1976D2', fontSize: 13, marginRight: 4 }}>
                          {site.length > 8 ? `${site.substring(0, 8)}...` : site}
                        </Text>
                        <Text style={{ color: '#1976D2', fontSize: 16 }}>×</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {blockedWebsites.length === 0 && (
                  <Text style={{ color: '#999', fontSize: 13, marginTop: 8 }}>
                    No websites blocked. Add domains above.
                  </Text>
                )}
              </View>
            )}

            {/* Toggles and Timer Section */}
            <View style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              {/* Block Settings Toggle */}
              <TouchableOpacity
                onPress={onToggleBlockSettings}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
              >
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: blockSettings ? '#ff9800' : '#ddd',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  {blockSettings && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#333' }}>Block Settings App</Text>
                  <Text style={{ fontSize: 12, color: '#888', marginTop: 1 }}>
                    WiFi & emergency remain accessible
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: '#eee', marginHorizontal: 16 }} />

              {/* No Time Limit Toggle */}
              <TouchableOpacity
                onPress={onToggleNoTimeLimit}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
              >
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: noTimeLimit ? '#007AFF' : '#ddd',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  {noTimeLimit && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#333' }}>No Time Limit</Text>
                  <Text style={{ fontSize: 12, color: '#888', marginTop: 1 }}>
                    Block until manually unlocked
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Timer Section */}
              {!noTimeLimit && (
                <>
                  <View style={{ height: 1, backgroundColor: '#eee', marginHorizontal: 16 }} />
                  <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: '#666',
                      marginBottom: 4,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      Duration
                    </Text>
                    <TimerPicker
                      days={timerDays}
                      hours={timerHours}
                      minutes={timerMinutes}
                      onDaysChange={onDaysChange}
                      onHoursChange={onHoursChange}
                      onMinutesChange={onMinutesChange}
                    />
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default memo(ConfigModal);
