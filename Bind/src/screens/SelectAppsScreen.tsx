import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { lightTap } from '../utils/haptics';

interface InstalledApp {
  id: string;
  name: string;
  icon?: string;
  isPopular?: boolean;
}

interface Props {
  apps: InstalledApp[];
  selectedApps: string[];
  blockedWebsites?: string[];
  loading: boolean;
  onToggle: (appId: string) => void;
  onClose: () => void;
  onSave: () => void;
  onAddWebsite?: (url: string) => void;
  onRemoveWebsite?: (url: string) => void;
}

// Search Icon
const SearchIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Back Arrow Icon
const BackIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M12 19l-7-7 7-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Globe Icon for websites
const GlobeIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface AppItemProps {
  item: InstalledApp;
  isSelected: boolean;
  onToggle: (appId: string) => void;
  cardColor: string;
  cardLightColor: string;
  textColor: string;
  textSecondaryColor: string;
  cyanColor: string;
  borderColor: string;
  iconSize: number;
  iconMarginRight: number;
  fallbackBorderRadius: number;
  fallbackFontSize: number;
}

const AppItem = memo(({ item, isSelected, onToggle, cardColor, cardLightColor, textColor, textSecondaryColor, cyanColor, borderColor, iconSize, iconMarginRight, fallbackBorderRadius, fallbackFontSize }: AppItemProps) => {
  const handlePress = useCallback(() => {
    lightTap();
    onToggle(item.id);
  }, [item.id, onToggle]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={{ backgroundColor: cardColor, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }}
      className="flex-row items-center py-3 px-4 rounded-xl mb-2"
    >
      {/* App Icon - native already provides squircle shape */}
      {item.icon ? (
        <Image
          source={{ uri: item.icon }}
          style={{ width: iconSize, height: iconSize, marginRight: iconMarginRight }}
        />
      ) : (
        <View style={{ width: iconSize, height: iconSize, marginRight: iconMarginRight, backgroundColor: cardLightColor, borderRadius: fallbackBorderRadius, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: textSecondaryColor, fontSize: fallbackFontSize, fontWeight: 'bold' }}>
            {item.name.charAt(0)}
          </Text>
        </View>
      )}

      {/* App Name */}
      <Text style={{ color: textColor }} className="flex-1 text-base font-nunito">{item.name}</Text>

      {/* Checkbox */}
      <View style={isSelected ? { backgroundColor: cyanColor, borderColor: cyanColor } : { borderColor: borderColor }} className="w-6 h-6 rounded-full border-2 items-center justify-center">
        {isSelected && <Text className="text-white text-sm font-bold"></Text>}
      </View>
    </TouchableOpacity>
  );
});

type TabType = 'apps' | 'websites';

function SelectAppsScreen({
  apps,
  selectedApps,
  blockedWebsites = [],
  loading,
  onToggle,
  onClose,
  onSave,
  onAddWebsite,
  onRemoveWebsite,
}: Props) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [activeTab, setActiveTab] = useState<TabType>('apps');
  const [searchQuery, setSearchQuery] = useState('');
  const [websiteInput, setWebsiteInput] = useState('');

  const selectedSet = useMemo(() => new Set(selectedApps), [selectedApps]);

  const filteredApps = useMemo(() => {
    if (!searchQuery) return apps;
    return apps.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [apps, searchQuery]);

  const renderItem = useCallback(({ item }: { item: InstalledApp }) => (
    <AppItem
      item={item}
      isSelected={selectedSet.has(item.id)}
      onToggle={onToggle}
      cardColor={colors.card}
      cardLightColor={colors.cardLight}
      textColor={colors.text}
      textSecondaryColor={colors.textSecondary}
      cyanColor={colors.cyan}
      borderColor={colors.border}
      iconSize={s(40)}
      iconMarginRight={s(12)}
      fallbackBorderRadius={s(10)}
      fallbackFontSize={s(18)}
    />
  ), [selectedSet, onToggle, colors, s]);

  const keyExtractor = useCallback((item: InstalledApp) => item.id, []);

  const handleAddWebsite = () => {
    const trimmed = websiteInput.trim().toLowerCase();
    if (trimmed && trimmed.includes('.') && onAddWebsite) {
      onAddWebsite(trimmed);
      setWebsiteInput('');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          onPress={() => { lightTap(); onClose(); }}
          className="p-2"
        >
          <BackIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold flex-1 text-center">
          Block List
        </Text>
        <TouchableOpacity
          onPress={() => setSearchQuery('')}
          className="p-2"
        >
          <SearchIcon color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-4 my-4">
        <TouchableOpacity
          onPress={() => { lightTap(); setActiveTab('apps'); }}
          style={{ backgroundColor: activeTab === 'apps' ? colors.text : colors.card, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }}
          className="flex-1 py-2 rounded-full items-center"
        >
          <Text style={{ color: activeTab === 'apps' ? colors.bg : colors.text }} className="text-base font-nunito-semibold">
            Apps
          </Text>
        </TouchableOpacity>
        <View className="w-2" />
        <TouchableOpacity
          onPress={() => { lightTap(); setActiveTab('websites'); }}
          style={{ backgroundColor: activeTab === 'websites' ? colors.text : colors.card, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }}
          className="flex-1 py-2 rounded-full items-center"
        >
          <Text style={{ color: activeTab === 'websites' ? colors.bg : colors.text }} className="text-base font-nunito-semibold">
            Websites
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'apps' ? (
        <>
          {/* Search Input */}
          <View className="px-4 mb-4">
            <View renderToHardwareTextureAndroid={true} style={{ backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }} className="flex-row items-center border rounded-xl px-4 py-3">
              <SearchIcon color={colors.textSecondary} />
              <TextInput
                placeholder="Search apps..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ color: colors.text }}
                className="flex-1 text-base font-nunito ml-3"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { lightTap(); setSearchQuery(''); }}>
                  <Text style={{ color: colors.textSecondary }} className="text-lg">✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <Lottie
                source={require('../frontassets/Loading Dots Blue.json')}
                autoPlay
                loop
                speed={2}
                style={{ width: s(250), height: s(250) }}
              />
              <Text style={{ color: colors.textSecondary }} className="text-base font-nunito mt-4">
                Loading apps...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredApps}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              removeClippedSubviews={true}
              maxToRenderPerBatch={15}
              windowSize={10}
              initialNumToRender={15}
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: s(100) }}
              ListHeaderComponent={
                selectedApps.length > 0 ? (
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mb-3">
                    {selectedApps.length} app{selectedApps.length !== 1 ? 's' : ''} selected
                  </Text>
                ) : null
              }
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Text style={{ color: colors.textSecondary }} className="text-base font-nunito">
                    No apps found
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <View className="flex-1 px-4">
          {/* Website Input */}
          <View className="mb-4">
            <View renderToHardwareTextureAndroid={true} style={{ backgroundColor: colors.card, borderColor: colors.yellow, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }} className="flex-row items-center border rounded-full px-4 py-3">
              <TextInput
                placeholder="e.g. instagram.com"
                placeholderTextColor={colors.textMuted}
                value={websiteInput}
                onChangeText={setWebsiteInput}
                autoCapitalize="none"
                keyboardType="url"
                style={{ color: colors.text }}
                className="flex-1 text-base font-nunito"
                onSubmitEditing={handleAddWebsite}
              />
              {websiteInput.length > 0 && (
                <TouchableOpacity onPress={() => { lightTap(); setWebsiteInput(''); }}>
                  <Text style={{ color: colors.textSecondary }} className="text-lg">✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ color: colors.textMuted }} className="text-xs font-nunito mt-2 px-2">
              Enter URLs like: instagram.com, reddit.com, etc
            </Text>
          </View>

          {/* Website List */}
          <FlatList
            data={blockedWebsites}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <View renderToHardwareTextureAndroid={true} style={{ backgroundColor: colors.card, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }} className="flex-row items-center py-3 px-4 rounded-xl mb-2">
                <View className="w-10 h-10 items-center justify-center mr-3">
                  <GlobeIcon color={colors.textSecondary} size={32} />
                </View>
                <Text style={{ color: colors.text }} className="flex-1 text-base font-nunito">{item}</Text>
                <View style={{ backgroundColor: colors.cyan, borderColor: colors.cyan }} className="w-6 h-6 rounded-full border-2 items-center justify-center">
                  <Text className="text-white text-sm font-bold">✓</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: s(100) }}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text style={{ color: colors.textSecondary }} className="text-base font-nunito">
                  No websites blocked yet
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Save Button */}
      <View style={{ backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border }} className="absolute bottom-0 left-0 right-0 p-4">
        <TouchableOpacity
          onPress={() => { lightTap(); onSave(); }}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.text, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }}
          className="rounded-full py-4 items-center"
        >
          <Text style={{ color: colors.bg }} className="text-lg font-nunito-semibold">
            Save Selection
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default memo(SelectAppsScreen);
