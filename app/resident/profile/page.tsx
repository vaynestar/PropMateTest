import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function ResidentProfilePage() {
  const sessionUser = await requireUser(["Resident"]);

  const user = await prisma.user.findUnique({
    where: { user_id: sessionUser.userId }
  });

  if (!user) {
    return <div>Profile not found.</div>;
  }

  return (
    <div className="flex flex-col gap-stack-lg max-w-3xl mx-auto">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          My Profile
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Manage your personal information and account security.
        </p>
      </div>

      <div className="glass-card rounded-xl p-6 flex flex-col gap-6">
        <h2 className="font-title-lg text-title-lg text-on-surface border-b border-outline-variant/30 pb-4">
          Personal Details
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
              Full Name
            </label>
            <div className="font-body-lg text-on-surface font-medium">
              {user.user_name}
            </div>
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
              Email Address (Login)
            </label>
            <div className="font-body-lg text-on-surface font-medium">
              {user.user_email}
            </div>
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
              Phone Number
            </label>
            <div className="font-body-lg text-on-surface font-medium">
              {user.phone_number || "Not provided"}
            </div>
          </div>
        </div>
        
        <p className="text-sm text-on-surface-variant/80 italic mt-2">
          Note: To update your personal details or email address, please contact the property management office.
        </p>
      </div>

      <div className="glass-card rounded-xl p-6 flex flex-col gap-6">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface border-b border-outline-variant/30 pb-4">
            Security
          </h2>
          <p className="text-sm text-on-surface-variant mt-3 mb-4">
            Change your password to keep your account secure.
          </p>
        </div>
        
        <PasswordForm />
      </div>
    </div>
  );
}
