import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import ScannerClient from "./ScannerClient";
import type { UserRole, UserStatus } from "@/types/database";

export default async function ScannerPage() {
  const headersList = await headers();
  const role = headersList.get("x-user-role") as UserRole | null;
  const status = headersList.get("x-user-status") as UserStatus | null;

  return (
    <>
      <ScannerClient />
      <MobileNav role={role} status={status} />
    </>
  );
}
