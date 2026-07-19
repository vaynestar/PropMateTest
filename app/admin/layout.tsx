import type { ReactNode } from "react";
import AdminLayout from "@/components/layout/AdminLayout";

export default function AdminSectionLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
