# Overlay Editor — Full Context for New Claude Session

## What Was Built

An **interactive overlay preview editor** was added to PresetSettingsScreen. Users can directly manipulate overlay elements (icon, blocked text, dismiss text, background) with touch gestures instead of using toggle-based sub-forms. The 4 sub-toggles (Custom Text, Text Color, Background Color, Custom Icon) were fully removed and replaced with direct manipulation on a phone mockup preview.

## Goal of THIS Session

**Extract the overlay editor into its own dedicated screen** in the main tab navigator (new "Overlays" tab with `bx-brush-sparkles` icon). The overlay editor should function as a standalone screen for creating/managing **overlay presets** (independent of blocking presets). Then, in PresetSettingsScreen's "Custom Overlay" toggle, instead of showing the inline editor, show a **modal picker** that lets the user choose from their saved overlay presets.

---

## App Architecture

### Navigation Structure
```
App.tsx
  └─ GestureHandlerRootView (react-native-gesture-handler)
      └─ ThemeProvider → SafeAreaProvider → AuthProvider
          └─ NavigationContainer
              └─ RootNavigator (auth state switch)
                  └─ case 'main': MainNavigator
                       └─ PresetSaveProvider (context for preset editing)
                            └─ MainStack (native stack)
                                 └─ MainTabNavigator (bottom tabs)
                                      ├─ Home → HomeScreen
                                      ├─ Presets → PresetsStack → PresetsScreen
                                      ├─ Stats → StatsScreen
                                      ├─ Settings → SettingsScreen
                                      └─ (Hidden editing screens)
                                           ├─ EditPresetApps
                                           ├─ PresetSettings
                                           └─ DatePicker
```

### Key Files for Navigation

**`Bind/src/navigation/MainTabNavigator.tsx`** — Bottom tab navigator with 4 visible tabs + 3 hidden screens:
```tsx
const Tab = createBottomTabNavigator<MainTabParamList>();
<Tab.Navigator tabBar={(props) => <BottomTabBar {...props} />} screenOptions={{ headerShown: false, animation: 'none', lazy: true, freezeOnBlur: true }}>
  <Tab.Screen name="Home" component={HomeScreen} />
  <Tab.Screen name="Presets" component={PresetsStack} />
  <Tab.Screen name="Stats" component={StatsScreen} />
  <Tab.Screen name="Settings" component={SettingsScreen} />
  <Tab.Screen name="EditPresetApps" component={EditPresetAppsScreen} options={{ lazy: false }} />
  <Tab.Screen name="PresetSettings" component={PresetSettingsScreen} options={{ lazy: false }} />
  <Tab.Screen name="DatePicker" component={DatePickerScreen} options={{ lazy: false }} />
</Tab.Navigator>
```

**`Bind/src/navigation/types.ts`** — Type definitions:
```ts
export type MainTabParamList = {
  Home: undefined;
  Presets: NavigatorScreenParams<PresetsStackParamList>;
  Stats: undefined;
  Settings: undefined;
  EditPresetApps: undefined;
  PresetSettings: undefined;
  DatePicker: undefined;
};
```

**`Bind/src/components/BottomTabBar.tsx`** — Custom tab bar with 4 visible tabs:
- Uses `TabName = 'home' | 'presets' | 'stats' | 'settings'` type
- `HIDDEN_ROUTES = ['EditPresetApps', 'PresetSettings', 'DatePicker']` — these hide the tab bar
- `routeNameMap` in `handleTabPress` maps tab names to route names
- Each tab uses a `TabItem` component with `renderIcon` callback
- Tab icons: Home (SVG), Presets (animated stacking discs), Stats (animated bars), Settings (rotating gear)
- `TabItemProps` interface: `{ label, isActive, onPress, renderIcon, activeColor, inactiveColor, isSettings?, isStats?, isPresets? }`
- Individual press handlers: `handleHomePress`, `handlePresetsPress`, `handleStatsPress`, `handleSettingsPress`
- The tab bar renders inside `<View className="flex-row pt-2">` with each `<TabItem />` as a child

**`Bind/src/navigation/PresetsStack.tsx`** — Preset editing context + stack:
- `PresetSaveProvider` wraps MainTabNavigator, providing context for preset CRUD
- `FinalSettingsState` interface persists form state between screens
- `PresetSaveContextValue` provides: onSave, getEditingPreset, setEditingPreset, getExistingPresets, getFinalSettingsState, setFinalSettingsState, etc.
- The stack itself just wraps `PresetsScreen` in a native stack navigator

### How Existing Screens Follow the Pattern

**PresetsScreen** (`Bind/src/screens/PresetsScreen.tsx`):
- Uses `useAuth()` for user data (email, presets, lock state)
- Uses `usePresetSave()` context for CRUD operations
- Renders a `FlatList` of `PresetCard` components
- Has a header with back arrow and add button
- Multiple modals for confirmations
- Saves/loads via `cardApi.ts` functions (`getPresets`, `savePreset`, `deletePreset`, `activatePreset`)

---

## Overlay Editor — Current Implementation Details

### All Overlay-Related Fields (18 fields)

| Category | Fields | Defaults |
|----------|--------|----------|
| Text Content | `customBlockedText`, `customDismissText` | `''` |
| Colors | `customBlockedTextColor`, `customOverlayBgColor`, `customDismissColor` | `''` |
| Image | `customOverlayImage`, `customOverlayImageSize` | `''`, `120` |
| Positions (% 0-100) | `iconPosX`, `iconPosY`, `blockedTextPosX`, `blockedTextPosY`, `dismissTextPosX`, `dismissTextPosY` | `50,30`, `50,50`, `50,70` |
| Visibility | `iconVisible`, `blockedTextVisible`, `dismissTextVisible` | `true` |
| Text Sizes | `blockedTextSize`, `dismissTextSize` | `11`, `7` |

### Preset Interface (in PresetCard.tsx and cardApi.ts)
```ts
export interface Preset {
  id: string;
  name: string;
  mode: 'all' | 'specific';
  selectedApps: string[];
  blockedWebsites: string[];
  timerDays: number; timerHours: number; timerMinutes: number; timerSeconds: number;
  blockSettings: boolean; noTimeLimit: boolean; isDefault: boolean; isActive: boolean;
  targetDate?: string | null;
  allowEmergencyTapout?: boolean;
  isScheduled?: boolean;
  scheduleStartDate?: string | null; scheduleEndDate?: string | null;
  repeat_enabled?: boolean; repeat_unit?: string; repeat_interval?: number;
  strictMode?: boolean;
  // --- Overlay fields ---
  customBlockedText?: string;
  customDismissText?: string;
  customBlockedTextColor?: string;
  customOverlayBgColor?: string;
  customDismissColor?: string;
  customOverlayImage?: string;
  customOverlayImageSize?: number;
  iconPosX?: number; iconPosY?: number;
  blockedTextPosX?: number; blockedTextPosY?: number;
  dismissTextPosX?: number; dismissTextPosY?: number;
  iconVisible?: boolean; blockedTextVisible?: boolean; dismissTextVisible?: boolean;
  blockedTextSize?: number; dismissTextSize?: number;
}
```

### FinalSettingsState (in PresetsStack.tsx)
Contains ALL the overlay fields as non-optional (with definite values) for persisting form state during screen transitions. Same 18 overlay fields as above but typed as required (`number`, `string`, `boolean`).

### Backend (server.js) Column Mapping

**GET /api/presets** (read):
```
p.icon_pos_x → iconPosX (default 50)        p.icon_visible → iconVisible (default true)
p.icon_pos_y → iconPosY (default 30)        p.blocked_text_visible → blockedTextVisible (default true)
p.blocked_text_pos_x → blockedTextPosX (50) p.dismiss_text_visible → dismissTextVisible (default true)
p.blocked_text_pos_y → blockedTextPosY (50) p.blocked_text_size → blockedTextSize (default 11)
p.dismiss_text_pos_x → dismissTextPosX (50) p.dismiss_text_size → dismissTextSize (default 7)
p.dismiss_text_pos_y → dismissTextPosY (70)
+ all text/color/image fields
```

**POST /api/presets** (write):
```
iconPosX → icon_pos_x, iconVisible → icon_visible, blockedTextSize → blocked_text_size, etc.
```

### Supabase Table: `user_presets`
All overlay columns exist (added via migrations). Key columns:
```sql
custom_blocked_text TEXT, custom_dismiss_text TEXT,
custom_blocked_text_color TEXT, custom_overlay_bg_color TEXT, custom_dismiss_color TEXT,
custom_overlay_image TEXT, custom_overlay_image_size INTEGER,
icon_pos_x REAL, icon_pos_y REAL,
blocked_text_pos_x REAL, blocked_text_pos_y REAL,
dismiss_text_pos_x REAL, dismiss_text_pos_y REAL,
icon_visible BOOLEAN DEFAULT true, blocked_text_visible BOOLEAN DEFAULT true, dismiss_text_visible BOOLEAN DEFAULT true,
blocked_text_size REAL DEFAULT 11, dismiss_text_size REAL DEFAULT 7
```

---

## Interactive Preview Editor — How It Works

### State Variables (PresetSettingsScreen.tsx ~lines 525-580)
```ts
// Element positions (percentage 0-100, 50=center)
const [iconPosX, setIconPosX] = useState(50);
const [iconPosY, setIconPosY] = useState(30);
const [blockedTextPosX, setBlockedTextPosX] = useState(50);
const [blockedTextPosY, setBlockedTextPosY] = useState(50);
const [dismissTextPosX, setDismissTextPosX] = useState(50);
const [dismissTextPosY, setDismissTextPosY] = useState(70);
const [previewWidth, setPreviewWidth] = useState(0);
const [previewHeight, setPreviewHeight] = useState(0);

// Animated values for drag
const iconPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
const blockedTextPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
const dismissTextPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
const isDragging = useRef(false);

// Interactive editor UI state
type PreviewElement = 'icon' | 'blockedText' | 'dismissText' | 'background';
const [selectedElement, setSelectedElement] = useState<PreviewElement | null>(null);
const [editingText, setEditingText] = useState<'blockedText' | 'dismissText' | null>(null);
const [iconVisible, setIconVisible] = useState(true);
const [blockedTextVisible, setBlockedTextVisible] = useState(true);
const [dismissTextVisible, setDismissTextVisible] = useState(true);
const [blockedTextSize, setBlockedTextSize] = useState(11);
const [dismissTextSize, setDismissTextSize] = useState(7);
const [contextMenuVisible, setContextMenuVisible] = useState(false);
const [contextMenuTarget, setContextMenuTarget] = useState<PreviewElement | null>(null);
const [colorPickerTarget, setColorPickerTarget] = useState<PreviewElement | null>(null);
const [colorPickerActiveWidth, setColorPickerActiveWidth] = useState(0);
const editInputRef = useRef<TextInput>(null);
const lastTapTimeRef = useRef<Record<string, number>>({});
```

### Gesture System (PanResponder factory ~lines 1020-1140)

`makeDraggablePanResponder` creates a PanResponder for each element that handles:
- **Single tap** (<300ms, no movement) → select/deselect element (white dashed highlight)
- **Double tap** (<300ms between taps, text elements only) → inline text editing (TextInput replaces Text)
- **Long press** (500ms, no movement) → context menu (Color + Delete/Change Image) + haptic
- **Drag** (>4px movement) → move element with grid snap (10% increments) + spring animation
- Disables ScrollView during drag via `mainScrollRef.current?.setNativeProps({ scrollEnabled: false })`

### Collision Prevention (~line 1005)
`findFreePosition(desiredX, desiredY, excludeKey)` — checks if another visible element occupies the desired grid cell. If so, searches all 121 grid positions (11×11) sorted by Manhattan distance and returns nearest free cell.

### Pinch-to-Resize (~lines 1192-1225)
- `PinchGestureHandler` wraps the phone preview View
- `handlePreviewPinchStateChange` captures base size at pinch start
- `handlePreviewPinch` scales size relative to base (throttled via rAF)
- Blocked text: clamped 5-20, Dismiss text: clamped 4-14, Image: clamped 30-300 (dp)
- Requires `GestureHandlerRootView` wrapper in App.tsx (already added)

### Color Picker Helpers (~lines 1155-1190)
- `handleColorPickerChange(color)` → dispatches to correct state setter based on `colorPickerTarget`
- Auto-enables `customBlockedTextColorEnabled`, `customOverlayBgColorEnabled`, etc.
- `activeColorPanResponder` uses `makeColorPickerPanResponder` factory (shared with old toggle pickers)
- `getActiveColor()` / `setActiveColor()` — get/set color for current picker target
- `SPECTRUM_COLORS = ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#8000FF', '#FF00FF', '#FF0000']`
- `getColorFromPosition(x, width)` interpolates between spectrum colors

### Preview JSX Structure (~lines 2094-2500)

```
ExpandableInfo (expanded when customOverlayEnabled)
  └─ View (px-6, paddingVertical)
      ├─ Text "Preview"
      ├─ PinchGestureHandler
      │   └─ View (phone mockup: 185dp wide, 9/19.5 aspect, rounded corners, border)
      │       ├─ TouchableOpacity (background tap layer — select background, long press for bg color)
      │       ├─ View (grid dots — 9×9 grid, 0.05 opacity, pointerEvents="none")
      │       ├─ {iconVisible && <View pointerEvents="box-none"> (icon layer)
      │       │   └─ Animated.View (transform: translate + selection border)
      │       │       └─ Image or MaterialCommunityIcons "android"
      │       ├─ {blockedTextVisible && <View pointerEvents="box-none"> (blocked text layer)
      │       │   └─ Animated.View (transform: translate + selection border)
      │       │       └─ TextInput (if editingText) or Text
      │       ├─ {dismissTextVisible && <View pointerEvents="box-none"> (dismiss text layer)
      │       │   └─ Animated.View (transform: translate + selection border)
      │       │       └─ TextInput (if editingText) or Text
      │       └─ PinchGestureHandler closing
      ├─ Context Menu (flexDirection: row, gap, card background)
      │   ├─ Color button (opens inline color picker below)
      │   ├─ Change Image button (icon only — calls handlePickImage)
      │   └─ Delete button (red bg — sets element visibility false)
      ├─ Inline Color Picker (gradient bar + hex input + reset)
      ├─ Hidden Elements Restore (+ buttons for each hidden element)
      └─ Reset Layout button
```

### Selection Highlight Style
```ts
selectedElement === 'icon' && {
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.7)',
  borderStyle: 'dashed' as const,
  borderRadius: s(6),
  padding: s(4),
}
```

Background selection changes the phone border: `borderColor: selectedElement === 'background' ? 'rgba(255,255,255,0.6)' : '#3A3A3C'`

### Context Menu Actions
- **Color** (text/background): Sets `colorPickerTarget` → shows inline gradient picker below preview
- **Change Image** (icon only): Calls `handlePickImage()` → opens device image library → uploads to backend → sets `customOverlayImage`
- **Delete** (non-background): Sets `*Visible = false` → element disappears, restore button appears

### Inline Text Editing
When `editingText === 'blockedText'` or `'dismissText'`:
- PanResponder handlers are removed from the Animated.View: `{...(editingText !== 'blockedText' ? blockedTextPanResponder.panHandlers : {})}`
- TextInput replaces Text with `autoFocus`, `multiline`, `onBlur={() => setEditingText(null)}`
- Also sets `customBlockedTextEnabled = true` on text change

### Save Handler Integration
The `handleSave` function builds a `Preset` object. Overlay fields are saved conditionally:
- Text/colors gated by visibility: hidden elements → data not saved (sent as undefined)
- Visibility booleans saved only when false (default true is omitted)
- Sizes saved only when non-default

### Image Upload Flow
`handlePickImage()`:
1. `launchImageLibrary()` from `react-native-image-picker` (maxWidth/Height 512, quality 0.8)
2. Uploads to `POST /api/overlay-image` with FormData (multipart)
3. Sets `customOverlayImage` to returned URL with cache-bust param
4. Auto-enables `customOverlayImageEnabled = true`

---

## What Needs to Change

### 1. New "Overlays" Tab in MainTabNavigator
- Add `Overlays` screen between Presets and Stats (or wherever desired)
- Use `BoxiconsFilled name="bx-brush-sparkles"` as the icon
- Add to `MainTabParamList`, `TabName` type, `BottomTabBar`, `HIDDEN_ROUTES` (no — it's visible)
- Create `OverlaysScreen` that functions like PresetsScreen but for overlay presets

### 2. New "Overlay Preset" Data Model
Create an `OverlayPreset` interface with just the 18 overlay fields + id + name:
```ts
interface OverlayPreset {
  id: string;
  name: string;
  // All 18 overlay fields from above
  customBlockedText?: string;
  customDismissText?: string;
  customBlockedTextColor?: string;
  customOverlayBgColor?: string;
  customDismissColor?: string;
  customOverlayImage?: string;
  customOverlayImageSize?: number;
  iconPosX?: number; iconPosY?: number;
  blockedTextPosX?: number; blockedTextPosY?: number;
  dismissTextPosX?: number; dismissTextPosY?: number;
  iconVisible?: boolean; blockedTextVisible?: boolean; dismissTextVisible?: boolean;
  blockedTextSize?: number; dismissTextSize?: number;
}
```

### 3. New Backend Table & API Routes
- New Supabase table: `user_overlay_presets` (email, id, name, + all 18 overlay columns)
- `GET /api/overlay-presets` — fetch all overlay presets for user
- `POST /api/overlay-presets` — create/update an overlay preset
- `DELETE /api/overlay-presets/:id` — delete an overlay preset

### 4. OverlaysScreen (new main tab screen)
- Shows a list/grid of saved overlay presets (like PresetsScreen shows blocking presets)
- Tap to edit → opens the interactive preview editor (can be inline or a separate editing screen)
- Add button to create new overlay preset
- Delete functionality
- The interactive preview editor (currently in PresetSettingsScreen) moves here

### 5. PresetSettingsScreen Changes
- The "Custom Overlay" toggle stays but behavior changes
- When toggled ON → shows a modal with a list of saved overlay presets to pick from
- Selected overlay preset's ID is saved with the blocking preset
- The entire interactive preview editor JSX, PanResponders, pinch handlers, color pickers, etc. are **removed** from PresetSettingsScreen and **moved** to the OverlaysScreen
- Add an `overlayPresetId` field to the blocking Preset interface
- In the save handler, just save `overlayPresetId` instead of all 18 individual overlay fields

### 6. Files to Modify
- `Bind/src/navigation/types.ts` — Add `Overlays` to `MainTabParamList`
- `Bind/src/navigation/MainTabNavigator.tsx` — Add `<Tab.Screen name="Overlays" />`
- `Bind/src/components/BottomTabBar.tsx` — Add Overlays tab item (new TabName, handler, icon)
- `Bind/src/screens/OverlaysScreen.tsx` — **NEW** — main list screen for overlay presets
- `Bind/src/screens/OverlayEditorScreen.tsx` — **NEW** (or inline in OverlaysScreen) — the interactive preview editor
- `Bind/src/screens/PresetSettingsScreen.tsx` — Remove editor, add overlay preset picker modal
- `Bind/src/services/cardApi.ts` — Add OverlayPreset interface + CRUD functions
- `Backend/server.js` — Add overlay preset routes + new table queries
- `Bind/src/components/PresetCard.tsx` — Add `overlayPresetId` field to Preset interface
- `Bind/src/navigation/PresetsStack.tsx` — Add `overlayPresetId` to FinalSettingsState

---

## Styling & Theme System

All screens use these imports from ThemeContext:
```ts
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
```
- `useTheme()` → `{ colors }` (bg, text, textSecondary, textMuted, card, border, dividerLight, red, etc.)
- `useResponsive()` → `{ s }` (scaling function for responsive sizing)
- `textSize` → `.base`, `.small`, `.extraSmall`, `.large` (className strings)
- `fontFamily` → `.regular`, `.semibold`, `.bold` (className strings)
- `radius` → `.xl`, `.lg`, etc. (className strings for border radius)
- `shadow` → `.card`, `.tabBar` (style objects)
- NativeWind (Tailwind) classNames: `px-6`, `flex-row`, `items-center`, `justify-between`, etc.
- `BoxiconsFilled` component for icons: `<BoxiconsFilled name="bx-icon-name" size={s(iconSize.toggleRow)} color={colors.text} />`

## App.tsx (current)
```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <AuthProvider>
            <NavigationContainer ref={navigationRef}>
              <RootNavigator />
            </NavigationContainer>
            <GlobalModals />
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```
