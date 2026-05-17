import SwiftUI

struct ProfileView: View {
    @State private var apiBase = APIClient.shared.baseURL.absoluteString
    @State private var testResult: String?
    @State private var testing = false

    var body: some View {
        Form {
            Section("Connection") {
                TextField("API Base URL", text: $apiBase)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button("Apply") {
                    if let url = URL(string: apiBase) {
                        APIClient.shared.baseURL = url
                    }
                }
                Button(testing ? "Testing..." : "Test Connection") {
                    Task {
                        testing = true
                        defer { testing = false }
                        testResult = await APIClient.shared.testConnection()
                    }
                }
                .disabled(testing)
                if let testResult {
                    Text(testResult).font(.caption).foregroundStyle(.secondary)
                }
                Button("Use localhost (Simulator)") {
                    apiBase = "http://localhost:3000"
                    if let url = URL(string: apiBase) { APIClient.shared.baseURL = url }
                }
                Button("Use LAN IP") {
                    apiBase = "http://192.168.112.225:3000"
                    if let url = URL(string: apiBase) { APIClient.shared.baseURL = url }
                }
            }

            Section("About") {
                Text("Avispotters iOS (SwiftUI)")
                Text("Uses existing Avispotters API")
            }
        }
        .navigationTitle("Profile")
    }
}
