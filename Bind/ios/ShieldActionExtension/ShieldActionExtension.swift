import ManagedSettings
import ManagedSettingsUI

/// This extension handles user interactions with the shield overlay
class ShieldActionExtension: ShieldActionDelegate {

  override func handle(
    action: ShieldAction,
    for application: ApplicationToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    handleAction(action: action, completionHandler: completionHandler)
  }

  override func handle(
    action: ShieldAction,
    for webDomain: WebDomainToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    handleAction(action: action, completionHandler: completionHandler)
  }

  override func handle(
    action: ShieldAction,
    for category: ActivityCategoryToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    handleAction(action: action, completionHandler: completionHandler)
  }

  /// Handle shield button actions
  private func handleAction(
    action: ShieldAction,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    switch action {
    case .primaryButtonPressed:
      // "Close" button - just dismiss the shield, keep blocking
      // User goes back to home screen, app stays blocked
      completionHandler(.close)

    case .secondaryButtonPressed:
      // We don't show a secondary button, but if we did this would handle it
      // Could be used for "Open Scute" or emergency unlock
      completionHandler(.close)

    @unknown default:
      completionHandler(.close)
    }
  }
}
