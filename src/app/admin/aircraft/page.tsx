import { requireAdmin } from "@/lib/admin-guard";
import { AircraftRegistryAdmin } from "@/components/admin/AircraftRegistryAdmin";

export default async function AdminAircraftPage() {
  await requireAdmin();
  return <AircraftRegistryAdmin />;
}

