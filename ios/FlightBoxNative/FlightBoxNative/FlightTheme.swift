import SwiftUI

enum FlightTheme {
    static let accent = Color(red: 0.05, green: 0.65, blue: 0.91)

    static let bgTop = Color(
        UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor(red: 0.05, green: 0.07, blue: 0.10, alpha: 1)
                : UIColor(red: 0.96, green: 0.98, blue: 1.0, alpha: 1)
        }
    )
    static let bgBottom = Color(
        UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor(red: 0.08, green: 0.11, blue: 0.16, alpha: 1)
                : UIColor(red: 0.92, green: 0.95, blue: 0.99, alpha: 1)
        }
    )
    static let card = Color(
        UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor.white.withAlphaComponent(0.08)
                : UIColor.white.withAlphaComponent(0.88)
        }
    )
}

struct GlassCard<Content: View>: View {
    let content: Content
    @Environment(\.colorScheme) private var colorScheme
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    var body: some View {
        content
            .padding(14)
            .background(FlightTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(colorScheme == .dark ? Color.white.opacity(0.18) : Color.white.opacity(0.6), lineWidth: 1)
            )
            .shadow(color: .black.opacity(colorScheme == .dark ? 0.22 : 0.06), radius: 10, x: 0, y: 8)
    }
}
