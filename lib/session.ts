import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type UserRole = "manager" | "user";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
};

/** Get the current session user with role. Returns null if not authenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as SessionUser;
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    image: u.image ?? undefined,
    role: u.role ?? "user",
  };
}
