import ManagedSettings
import ManagedSettingsUI
import UIKit

/// This extension customizes the appearance of the block overlay (shield)
class ShieldConfigurationExtension: ShieldConfigurationDataSource {

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    return createShieldConfiguration(for: application.localizedDisplayName)
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    return createShieldConfiguration(for: application.localizedDisplayName ?? category.localizedDisplayName)
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    return createShieldConfiguration(for: webDomain.domain)
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    return createShieldConfiguration(for: webDomain.domain ?? category.localizedDisplayName)
  }

  /// Creates a consistent shield configuration matching the app's design
  private func createShieldConfiguration(for name: String?) -> ShieldConfiguration {
    // Get preset name from shared defaults
    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
    let presetName = sharedDefaults?.string(forKey: "activePresetName") ?? "Focus Session"

    // Create the shield configuration
    // Using Scute's dark theme colors
    let backgroundColor = UIColor(red: 0.07, green: 0.07, blue: 0.09, alpha: 1.0) // #121217
    let primaryColor = UIColor.white
    let secondaryColor = UIColor(red: 0.6, green: 0.6, blue: 0.65, alpha: 1.0)

    return ShieldConfiguration(
      backgroundBlurStyle: .systemUltraThinMaterialDark,
      backgroundColor: backgroundColor,
      icon: UIImage(systemName: "lock.shield.fill"),
      title: ShieldConfiguration.Label(
        text: "App Blocked",
        color: primaryColor
      ),
      subtitle: ShieldConfiguration.Label(
        text: "\(presetName) is active",
        color: secondaryColor
      ),
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Close",
        color: backgroundColor
      ),
      primaryButtonBackgroundColor: primaryColor,
      secondaryButtonLabel: nil // No secondary button - prevents easy bypass
    )
  }
}
