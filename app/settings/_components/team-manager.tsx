"use client";

import { useState } from "react";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export function TeamManager({ initialUsers }: { initialUsers: TeamUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "manager">("user");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("All fields are required.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create user.");
        return;
      }

      setUsers((prev) => [...prev, data.user]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setShowForm(false);
      toast.success(`Account created for ${data.user.name}`);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel className="animate-stagger-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-medium text-brand-textPrimary">
          Team Members
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="text-xs gap-1.5"
        >
          {showForm ? "Cancel" : <><UserPlus size={14} /> Add member</>}
        </Button>
      </div>

      {/* User list */}
      <div className="space-y-1 mb-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-brand-textSecondary truncate">
                {u.name}
              </div>
              <div className="text-xs text-brand-textFaint truncate">
                {u.email}
              </div>
            </div>
            <span
              className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                u.role === "manager"
                  ? "bg-brand-accent/10 text-brand-accent"
                  : "bg-white/5 text-brand-textFaint"
              }`}
            >
              {u.role}
            </span>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 border-t border-brand-border/20 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-brand-textMuted">Name</Label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-brand-textMuted">Email</Label>
              <Input
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-brand-textMuted">Password</Label>
              <Input
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-brand-textMuted">Role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "user" | "manager")}
                className="w-full h-9 rounded-md border border-brand-border bg-brand-bg px-3 text-sm text-brand-textPrimary focus:outline-none focus:ring-1 focus:ring-brand-accent"
              >
                <option value="user">User (Rep)</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            size="sm"
            className="bg-brand-accent text-black hover:bg-brand-accent/90 gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create Account
          </Button>
        </form>
      )}
    </Panel>
  );
}
