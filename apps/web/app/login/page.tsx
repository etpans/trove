import AuthPageShell from "../components/auth/AuthPageShell";

export default function LoginPage() {
  return (
    <AuthPageShell
      mode="login"
      turnstileSiteKey={process.env.NEXT_TURNSTILE_SITE_KEY}
    />
  );
}
