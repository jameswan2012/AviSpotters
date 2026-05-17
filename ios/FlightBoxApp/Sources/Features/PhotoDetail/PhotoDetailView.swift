import SwiftUI

struct PhotoDetailView: View {
    let photo: Photo

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                AsyncImage(url: APIClient.shared.imageURL(photoId: photo.id, variant: "display")) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    RoundedRectangle(cornerRadius: 16).fill(Color.gray.opacity(0.2)).frame(height: 240)
                }
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                GlassCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(photo.title ?? photo.registration)
                            .font(.title3.bold())
                        Text("Registration: \(photo.registration)")
                        Text("Airport: \(photo.shotAirport ?? "-")")
                        Text("Airline: \(photo.airline ?? "-")")
                        Text("Model: \(photo.aircraftModel ?? "-")")
                    }
                    .font(.subheadline)
                }
            }
            .padding(16)
        }
        .navigationTitle("Photo")
        .navigationBarTitleDisplayMode(.inline)
    }
}
