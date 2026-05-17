# FlightBox iOS App (SwiftUI)

This is a new iOS app project scaffold based on your current FlightBox UI style.

## Included

- Home feed with card layout and glass style
- Photo detail page
- Admin review tab with HOT toggle
- Profile tab for API base URL switch
- Direct integration with existing backend endpoints:
  - `GET /api/admin/photos`
  - `POST /api/admin/photos/:id` with `{ hot: boolean }`

## Create Xcode project

This scaffold uses XcodeGen:

```bash
brew install xcodegen
cd ios/FlightBoxApp
xcodegen generate
open FlightBoxApp.xcodeproj
```

## Run

1. Start backend (`npm run dev` or production).
2. In app Profile tab set `API Base URL` (e.g. `http://192.168.1.20:3000`).
3. Make sure your admin login session/cookie is available for admin endpoints.

## Next recommended

- Add native login screen and cookie/token storage.
- Replace `GET /api/admin/photos` with a dedicated mobile feed endpoint.
- Add upload and photo inspector modules as native screens.
