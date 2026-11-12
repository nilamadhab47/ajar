import { Suspense } from "react";
import { LoadingState } from "@/components/common/LoadingState";
import { SignInPage } from "@/features/auth/sign-in-page";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening sign-in…" fullscreen />}>
      <SignInPage />
    </Suspense>
  );
}
