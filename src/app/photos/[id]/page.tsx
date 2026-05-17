import { redirect } from "next/navigation";

export default async function PhotoDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/gallery/${encodeURIComponent(id)}`);
}
