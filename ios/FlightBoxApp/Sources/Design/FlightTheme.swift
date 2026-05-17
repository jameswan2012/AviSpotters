import SwiftUI

enum FlightTheme {
    static let accent = Color(red: 0.05, green: 0.65, blue: 0.91)
    static let bgTop = Color(red: 0.96, green: 0.98, blue: 1.0)
    static let bgBottom = Color(red: 0.92, green: 0.95, blue: 0.99)
    static let card = Color.white.opacity(0.88)
}

struct GlassCard<Content: View>: View {
    let content: Content

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
                    .stroke(Color.white.opacity(0.6), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 8)
    }
}
