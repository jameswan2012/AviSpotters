import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect("/photos/upload");
}

