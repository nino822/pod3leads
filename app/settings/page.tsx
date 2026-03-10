"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface Invite {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export default function Settings() {
  const { user, status, refresh } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteName, setNewInviteName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchInvites();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.user) {
        setDisplayName(data.user.displayName || data.user.name || "");
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/invites");
      const data = await res.json();
      if (data.invites) {
        setInvites(data.invites);
      }
    } catch (err) {
      console.error("Failed to fetch invites:", err);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }

    setIsSavingName(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to update display name");
      }

      await refresh();
      setSuccess("Display name updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsSavingName(false);
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

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newInviteEmail.trim(),
          name: newInviteName.trim(),
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

      setSuccess("Invite sent successfully!");
      setNewInviteEmail("");
      setNewInviteName("");
      fetchInvites();
      setTimeout(() => setSuccess(""), 3000);
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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your profile and invites</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6"
          >
            {success}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Display Name</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button onClick={handleSaveName} disabled={isSavingName} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50">
              {isSavingName ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Users</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="email"
              value={newInviteEmail}
              onChange={(e) => setNewInviteEmail(e.target.value)}
              placeholder="Email address"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              value={newInviteName}
              onChange={(e) => setNewInviteName(e.target.value)}
              placeholder="Name"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleAddInvite}
              disabled={isInviting}
              className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {isInviting ? "Adding..." : "Add Invite"}
            </button>
          </div>

          {invites.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Invited Users</h3>
              {invites.map((invite) => (
                <div key={invite.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{invite.name}</p>
                    <p className="text-sm text-gray-600">{invite.email}</p>
                  </div>
                  <button onClick={() => handleDeleteInvite(invite.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No invites yet</p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
