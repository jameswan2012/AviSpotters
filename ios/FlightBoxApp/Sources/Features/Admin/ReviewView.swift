import SwiftUI

struct ReviewView: View {
    @State private var photos: [Photo] = []
    @State private var loading = false
    @State private var message: String?

    var body: some View {
        List {
            if let message {
                Section {
                    Text(message).foregroundStyle(.secondary)
                }
            }

            ForEach(photos) { photo in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(photo.title ?? photo.registration).font(.headline)
                        Spacer()
                        if photo.hot == true {
                            Label("HOT", systemImage: "flame.fill").font(.caption).foregroundStyle(.orange)
                        }
                    }

                    Toggle("HOT", isOn: Binding(
                        get: { photo.hot ?? false },
                        set: { newValue in
                            Task { await applyHot(photo: photo, hot: newValue) }
                        }
                    ))
                    .toggleStyle(.switch)
                }
                .padding(.vertical, 4)
            }
        }
        .overlay {
            if loading { ProgressView() }
        }
        .navigationTitle("Review")
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            photos = try await APIClient.shared.fetchLatestPhotos()
            message = "Admin endpoint connected"
        } catch {
            message = "Need admin login/cookie and valid base URL."
        }
    }

    private func applyHot(photo: Photo, hot: Bool) async {
        do {
            let updated = try await APIClient.shared.toggleHot(photoId: photo.id, hot: hot)
            if let idx = photos.firstIndex(where: { $0.id == updated.id }) {
                photos[idx] = updated
            }
        } catch {
            message = "HOT update failed."
        }
    }
}
