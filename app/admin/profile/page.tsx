import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const sessionUser = await requireUser(["Admin"]);

  const user = await prisma.user.findUnique({
    where: { user_id: sessionUser.userId },
  });

  if (!user) {
    return <div className="text-white">Admin profile not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Administrator Profile</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage your account credentials, security access, and system identity
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-5">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-base text-primary">
              {user.user_name ? user.user_name.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{user.user_name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-primary font-semibold">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
              Official Name
            </span>
            <span className="text-sm font-semibold text-white">{user.user_name}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
              Login Email Address
            </span>
            <span className="text-sm font-semibold text-white">{user.user_email}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
              Contact Phone
            </span>
            <span className="text-sm font-semibold text-white">
              {user.phone_number || "Not configured"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
              Account Role
            </span>
            <span className="text-sm font-semibold text-white">{user.role}</span>
          </div>
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-5">
        <div className="border-b border-outline-variant/30 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
            Account Security & Authentication
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Update your administrator password for the PropMate management portal
          </p>
        </div>

        <PasswordForm />
      </div>
    </div>
  );
}
