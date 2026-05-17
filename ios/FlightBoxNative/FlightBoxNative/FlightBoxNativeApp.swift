import SwiftUI

@main
struct AviSpottersApp: App {
    @StateObject private var auth = AuthStore()
    @StateObject private var app = AppState()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(auth)
                .environmentObject(app)
                .preferredColorScheme(app.preferredColorScheme)
                .task {
                    await auth.bootstrap()
                    await app.refreshMaintenance()
                }
        }
    }
}
