# Add borderWidth: 1, borderColor: colors.border to all shadow elements
# Skip: AnimatedSwitch.tsx (toggles), ThemeContext.tsx (definitions)
# Skip files already done: BlockNowButton.tsx, PresetCard.tsx, SettingsScreen.tsx

$files = @(
    "Bind\src\components\PresetEditModal.tsx",
    "Bind\src\components\ConfirmationModal.tsx",
    "Bind\src\components\Button.tsx",
    "Bind\src\components\BottomTabBar.tsx",
    "Bind\src\components\GoogleSignInButton.tsx",
    "Bind\src\components\EmergencyTapoutModal.tsx",
    "Bind\src\components\DatePickerModal.tsx",
    "Bind\src\components\InfoModal.tsx",
    "Bind\src\components\ScheduleInfoModal.tsx",
    "Bind\src\components\RecurrenceInfoModal.tsx",
    "Bind\src\components\ShieldIconsInfoModal.tsx",
    "Bind\src\components\ExcludedAppsInfoModal.tsx",
    "Bind\src\components\AppSelectionInfoModal.tsx",
    "Bind\src\components\EmailConfirmationModal.tsx",
    "Bind\src\components\DisableTapoutWarningModal.tsx",
    "Bind\src\components\BlockSettingsWarningModal.tsx",
    "Bind\src\components\StrictModeWarningModal.tsx",
    "Bind\src\components\SettingsBlockWarningModal.tsx",
    "Bind\src\components\TapoutWarningModal.tsx",
    "Bind\src\screens\HomeScreen.tsx",
    "Bind\src\screens\PresetsScreen.tsx",
    "Bind\src\screens\SelectAppsScreen.tsx",
    "Bind\src\screens\PermissionsChecklistScreen.tsx",
    "Bind\src\screens\SignInScreen.tsx",
    "Bind\src\screens\GetStartedScreen.tsx",
    "Bind\src\screens\ForgotPasswordScreen.tsx",
    "Bind\src\screens\MembershipScreen.tsx",
    "Bind\src\screens\TermsAcceptScreen.tsx"
)

$basePath = "c:\Users\Shado\OneDrive\Desktop\ScuteProgram"
$totalChanges = 0

foreach ($file in $files) {
    $fullPath = Join-Path $basePath $file
    if (-not (Test-Path $fullPath)) {
        Write-Host "SKIP (not found): $file"
        continue
    }

    $content = Get-Content $fullPath -Raw
    $original = $content

    # Pattern 1: inline style with shadowColor that does NOT already have borderColor
    # Match: shadowColor: '#000000' where there's no borderColor nearby in same style block
    # We add borderWidth: 1, borderColor: colors.border, right before shadowColor

    # For single-line styles: style={{ ... shadowColor: '#000000' ... }}
    # Add borderWidth: 1, borderColor: colors.border, before shadowColor if not already present
    $content = [regex]::Replace($content, '(?<!borderColor: colors\.border, )shadowColor: ''#000000''', {
        param($m)
        # Check if borderColor already exists nearby (within 200 chars before)
        $startIdx = [Math]::Max(0, $m.Index - 200)
        $preceding = $content.Substring($startIdx, $m.Index - $startIdx)
        if ($preceding -match 'borderColor') {
            return $m.Value
        }
        return "borderWidth: 1, borderColor: colors.border, shadowColor: '#000000'"
    })

    if ($content -ne $original) {
        $changes = 0
        # Count how many borderWidth: 1 were added
        $origCount = ([regex]::Matches($original, 'borderWidth: 1')).Count
        $newCount = ([regex]::Matches($content, 'borderWidth: 1')).Count
        $changes = $newCount - $origCount

        Set-Content $fullPath $content -NoNewline
        Write-Host "UPDATED: $file (+$changes borders)"
        $totalChanges += $changes
    } else {
        Write-Host "NO CHANGE: $file"
    }
}

Write-Host ""
Write-Host "Total borders added: $totalChanges"
