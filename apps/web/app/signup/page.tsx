import AuthPageShell from "../components/auth/AuthPageShell";

export default function SignupPage() {
  return (
    <AuthPageShell
      mode="signup"
      turnstileSiteKey={process.env.NEXT_TURNSTILE_SITE_KEY}
    />
  );
}
