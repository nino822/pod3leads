"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import ThemeToggle from "@/components/ThemeToggle";

interface Invite {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
}

export default function Settings() {
  const { user, status, refresh } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";
  const [displayName, setDisplayName] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteName, setNewInviteName] = useState("");
  const [newInviteRole, setNewInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [newInvitePassword, setNewInvitePassword] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      if (user.role === "ADMIN") {
        fetchInvites();
      }
    }
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(() => {
      fetchInvites();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.user) {
        setDisplayName(data.user.displayName || data.user.name || "");
        setProfileImage(data.user.image || "");
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/invites", { cache: "no-store" });
      const data = await res.json();
      if (data.invites) {
        setInvites(data.invites);
      }
    } catch (err) {
      console.error("Failed to fetch invites:", err);
    }
  };

  const handleProfileSave = async () => {
    if (!displayName.trim()) {
      setProfileStatus({ type: "error", text: "Display name cannot be empty" });
      return;
    }

    setProfileLoading(true);
    setProfileStatus(null);

    try {
      const payload = {
        displayName: displayName.trim(),
        image: profileImage,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update profile");
      }

      setProfileStatus({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setProfileStatus(null), 3000);
      if (data?.user?.image !== undefined) {
        setProfileImage(data.user.image || "");
      }
      await refresh();
    } catch (err) {
      setProfileStatus({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordUpdate = async () => {
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", text: "Passwords must match" });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update password");
      }

      setPasswordStatus({ type: "success", text: "Password updated successfully" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordStatus({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update password",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAddInvite = async () => {
    if (!newInviteEmail.trim() || !newInviteName.trim()) {
      setError("Both email and name are required");
      return;
    }

    setIsInviting(true);
    setError("");
    setSuccess("");
    setInviteLink("");

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newInviteEmail.trim(),
          name: newInviteName.trim(),
          role: newInviteRole,
          password: newInvitePassword,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const errorMessage = data?.details
          ? `${data.error || "Failed to add invite"}: ${data.details}`
          : data?.error || "Failed to add invite";
        throw new Error(errorMessage);
      }

      if (data?.inviteUrl) {
        setInviteLink(data.inviteUrl);
      }

      if (data?.emailSent === false) {
        const warning = data?.warning || "Invite created. Email was not sent.";
        const details = data?.details ? ` (${data.details})` : "";
        setSuccess(`${warning}${details}`);
      } else {
        setSuccess("Invite sent successfully!");
        setTimeout(() => setSuccess(""), 3000);
      }

      setNewInviteEmail("");
      setNewInviteName("");
      setNewInviteRole("MEMBER");
      setNewInvitePassword("");
      fetchInvites();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invite request failed with an invalid server response.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to add invite");
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to remove this invite?")) {
      return;
    }

    try {
      const res = await fetch(`/api/invites?id=${inviteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete invite");
      }

      fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete invite");
    }
  };

  const memberInviteCount = invites.filter((invite) => invite.role === "MEMBER").length;
  const adminInviteCount = invites.filter((invite) => invite.role === "ADMIN").length;
  const profileInitials = (
    (displayName || user?.name || "U")
      .split(" ")
      .filter(Boolean)
      .map((segment) => segment[0])
      .join("")
      .slice(0, 2) || "U"
  ).toUpperCase();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
      <header className="bg-white dark:bg-slate-900 shadow border-b border-transparent dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Manage your profile and invites</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/70 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6"
          >
            {success}
          </motion.div>
        )}

        {isAdmin && inviteLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/70 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg mb-6"
          >
            <p className="text-sm font-medium mb-2">Share this invite link manually:</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                value={inviteLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
              />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink);
                  setSuccess("Invite link copied to clipboard.");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
              >
                Copy Link
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 mb-6 border border-transparent dark:border-slate-700"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex items-center justify-center w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800 text-3xl font-semibold text-slate-600 dark:text-slate-200 overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{profileInitials}</span>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
                <button
                  onClick={handleProfileSave}
                  disabled={profileLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {profileLoading ? "Saving..." : "Update profile"}
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-600 dark:text-slate-400">
                <label className="flex flex-col gap-2">
                  Profile picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="text-sm text-gray-700 dark:text-slate-200"
                  />
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setProfileImage("")}
                    className="text-sm text-slate-500 dark:text-slate-400 underline"
                  >
                    Remove photo
                  </button>
                  <p className="text-xs text-gray-500 dark:text-slate-500">
                    Upload a JPG/PNG so teammates can recognize you.
                  </p>
                </div>
              </div>
              {profileStatus && (
                <div
                  className={`px-3 py-2 rounded-lg text-sm ${
                    profileStatus.type === "success"
                      ? "bg-green-50 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                      : "bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                  }`}
                >
                  {profileStatus.text}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {isAdmin ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-transparent dark:border-slate-700 mb-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Members & Invites</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Invites sent: {invites.length} · Members invited: {memberInviteCount} · Admin invites: {adminInviteCount}
                </p>
              </div>
              <button
                onClick={() => setShowInviteForm((prev) => !prev)}
                className="self-start rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition"
              >
                {showInviteForm ? "Hide invite form" : "Invite users"}
              </button>
            </div>

            {showInviteForm && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input
                  type="email"
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                  placeholder="Email address"
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={newInviteName}
                  onChange={(e) => setNewInviteName(e.target.value)}
                  placeholder="Name"
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
                <select
                  value={newInviteRole}
                  onChange={(e) => setNewInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <input
                  type="password"
                  value={newInvitePassword}
                  onChange={(e) => setNewInvitePassword(e.target.value)}
                  placeholder="Password (optional)"
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
                <button
                  onClick={handleAddInvite}
                  disabled={isInviting}
                  className="md:col-span-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {isInviting ? "Adding..." : "Add invite"}
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">
              Set a password if you want password fallback to work immediately without OTP.
            </p>

            {invites.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Invited Users</h3>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{invite.name}</p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">{invite.email}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">Role: {invite.role}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteInvite(invite.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No invites yet</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-transparent dark:border-slate-700 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Role: Member</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">Members cannot invite users.</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-transparent dark:border-slate-700"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Change password</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            Update the password you use for the fallback login method.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handlePasswordUpdate}
              disabled={passwordLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {passwordLoading ? "Updating..." : "Update password"}
            </button>
          </div>
          {passwordStatus && (
            <div
              className={`mt-4 px-3 py-2 rounded-lg text-sm ${
                passwordStatus.type === "success"
                  ? "bg-green-50 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                  : "bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              }`}
            >
              {passwordStatus.text}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
