import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "avispotters-secret-change-in-production"
);

type PreviewTokenPayload = {
  photoId: string;
  purpose: "photo_email_preview";
};

export async function createPhotoEmailPreviewToken(photoId: string, expiresIn: string = "7d") {
  return new SignJWT({
    photoId,
    purpose: "photo_email_preview",
  } satisfies PreviewTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

export async function verifyPhotoEmailPreviewToken(token: string, photoId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const purpose = payload?.purpose;
    const tokenPhotoId = payload?.photoId;
    return purpose === "photo_email_preview" && tokenPhotoId === photoId;
  } catch {
    return false;
  }
}
