# Avispotters iOS (No XcodeGen)

This is a direct `.xcodeproj` iOS app project (SwiftUI) and does not require XcodeGen.

## Open

```bash
open /Users/longmei/Desktop/FlightBox/ios/FlightBoxNative/FlightBoxNative.xcodeproj
```

## Notes

- If `xcodebuild` reports CommandLineTools only, install full Xcode from App Store.
- Then set:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

- API base URL can be changed inside app: `Me` tab -> `Connection`.
