import { redirect } from "next/navigation";
import { navItems } from "@/lib/nav-config";
import { readSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  let landing = "/dashboard";
  try {
    const [settings, sessionUser] = await Promise.all([
      readSettings(),
      getSessionUser(),
    ]);
    const target = navItems.find((i) => i.href === settings.defaultLandingPage);
    if (target && (!target.managerOnly || sessionUser?.role === "manager")) {
      landing = target.href;
    }
  } catch {
    // DB unreachable — fall back to the default landing page
  }
  redirect(landing);
}
