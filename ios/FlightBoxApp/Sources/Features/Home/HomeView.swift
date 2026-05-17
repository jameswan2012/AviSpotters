import SwiftUI

struct HomeView: View {
    @State private var photos: [Photo] = []
    @State private var loading = false
    @State private var errorText: String?

    var body: some View {
        ZStack {
            LinearGradient(colors: [FlightTheme.bgTop, FlightTheme.bgBottom], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Aviation Photo Gallery")
                        .font(.largeTitle.bold())
                    Text("Avispotters iOS App")
                        .foregroundStyle(.secondary)

                    if let errorText {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(errorText)
                                    .foregroundStyle(.red)
                                    .font(.subheadline)
                                Text("Tip: start backend and set API URL in Me tab")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    if loading {
                        ProgressView("Loading photos...")
                            .frame(maxWidth: .infinity, alignment: .center)
                    }

                    ForEach(photos) { photo in
                        NavigationLink(value: photo) {
                            PhotoRow(photo: photo)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
        }
        .navigationDestination(for: Photo.self) { photo in
            PhotoDetailView(photo: photo)
        }
        .task { await load() }
        .refreshable { await load() }
        .navigationTitle("Avispotters")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            photos = try await APIClient.shared.fetchLatestPhotos()
            errorText = nil
        } catch {
            errorText = "Failed to load photos: \(error.localizedDescription)"
        }
    }
}

private struct PhotoRow: View {
    let photo: Photo

    var body: some View {
        GlassCard {
            HStack(spacing: 12) {
                AsyncImage(url: APIClient.shared.imageURL(photoId: photo.id)) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.gray.opacity(0.2)
                }
                .frame(width: 92, height: 92)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 6) {
                    Text(photo.title ?? photo.registration)
                        .font(.headline)
                        .lineLimit(1)
                    Text("\(photo.airline ?? "-") · \(photo.aircraftModel ?? "-")")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    if photo.hot == true {
                        Label("HOT", systemImage: "flame.fill")
                            .font(.caption.bold())
                            .foregroundStyle(.orange)
                    }
                }
                Spacer()
            }
        }
    }
}
