import { requireStaff } from "@/lib/admin-guard";
import { AircraftSubmissionsAdmin } from "@/components/admin/AircraftSubmissionsAdmin";

export default async function AdminAircraftSubmissionsPage() {
  await requireStaff();
  return <AircraftSubmissionsAdmin />;
}

