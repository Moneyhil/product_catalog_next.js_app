import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <SignUp key="magic-link-mode" forceRedirectUrl="/" />
    </main>
  );
}
