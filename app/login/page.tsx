import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { AuthForm } from "./_components/auth-form";

export default async function LoginPage() {
  const [userCount, googleConfigured] = await Promise.all([
    prisma.user.count(),
    Promise.resolve(
      !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    ),
  ]);

  const signupAllowed = userCount === 0;
  const googleAvailable = googleConfigured && !signupAllowed;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <Suspense>
        <AuthForm
          signupAllowed={signupAllowed}
          googleAvailable={googleAvailable}
        />
      </Suspense>
    </div>
  );
}
