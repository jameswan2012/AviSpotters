import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            NavigationStack { HomeView() }
                .tabItem { Label("Home", systemImage: "house.fill") }

            NavigationStack { ReviewView() }
                .tabItem { Label("Review", systemImage: "checkmark.shield.fill") }

            NavigationStack { ProfileView() }
                .tabItem { Label("Me", systemImage: "person.crop.circle.fill") }
        }
        .tint(FlightTheme.accent)
    }
}
