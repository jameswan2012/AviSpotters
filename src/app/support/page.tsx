import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { SupportChat } from "@/components/support/SupportChat";

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="w-full">
      <SupportChat />
    </div>
  );
}

