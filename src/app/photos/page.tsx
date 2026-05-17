import { redirect } from "next/navigation";

export default async function PhotosIndexRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; featured?: string }>;
}) {
  const sp = await searchParams;
  const next = new URLSearchParams();
  if (sp.q) next.set("q", sp.q);
  if (sp.cat) next.set("cat", sp.cat);
  if (sp.featured) next.set("featured", sp.featured);
  redirect(next.size ? `/gallery?${next.toString()}` : "/gallery");
}
