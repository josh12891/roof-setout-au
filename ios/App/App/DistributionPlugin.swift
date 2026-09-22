import Foundation
import Capacitor

/// Inspect the App Store receipt so JS can tell TestFlight from a store customer build.
/// TestFlight: last path component `sandboxReceipt` and no `embedded.mobileprovision`.
/// Production App Store: last path component `receipt`.
@objc(DistributionPlugin)
public class DistributionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DistributionPlugin"
    public let jsName = "Distribution"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "inspect", returnType: CAPPluginReturnPromise)
    ]

    @objc func inspect(_ call: CAPPluginCall) {
        let receiptLastPathComponent = Bundle.main.appStoreReceiptURL?.lastPathComponent ?? ""
        let provisionPath = Bundle.main.path(forResource: "embedded", ofType: "mobileprovision")
        call.resolve([
            "receiptLastPathComponent": receiptLastPathComponent,
            "hasEmbeddedMobileProvision": provisionPath != nil
        ])
    }
}
