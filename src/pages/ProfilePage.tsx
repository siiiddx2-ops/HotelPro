import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { Spinner } from "../components/ui";
import { User, Mail, Phone, Lock, Loader2, Save, Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function ProfilePage() {
  const { profile, session, updateProfile, changePassword } = useAuth();
  const { push } = useToast();
  const { theme, toggle } = useTheme();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
    setSavingProfile(false);
    if (error) push(error, "error");
    else push("Profile updated.", "success");
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      push("Passwords don't match.", "error");
      return;
    }
    setSavingPassword(true);
    const { error } = await changePassword(newPassword);
    setSavingPassword(false);
    if (error) push(error, "error");
    else {
      push("Password changed.", "success");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  if (!profile) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary-600" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="section-title">My Profile</h1>
        <p className="mt-1 text-ink-500 dark:text-ink-400">Manage your account and preferences.</p>
      </div>

      {/* Profile header card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-ink-50">{profile.full_name || "User"}</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 capitalize">{profile.role} · {session?.user?.email}</p>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Personal information</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input pl-9" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input value={session?.user?.email ?? ""} disabled className="input pl-9 opacity-60" />
            </div>
          </div>
          <div>
            <label className="label">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100" className="input pl-9" />
            </div>
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save changes</>}
          </button>
        </form>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-ink-800 dark:text-ink-200">Theme</p>
            <p className="text-sm text-ink-500 dark:text-ink-400">Switch between light and dark mode.</p>
          </div>
          <button onClick={toggle} className="btn-secondary">
            {theme === "light" ? <><Moon className="h-4 w-4" /> Dark mode</> : <><Sun className="h-4 w-4" /> Light mode</>}
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Change password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input pl-9" placeholder="At least 6 characters" />
            </div>
          </div>
          <div>
            <label className="label">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input pl-9" placeholder="Re-enter new password" />
            </div>
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
