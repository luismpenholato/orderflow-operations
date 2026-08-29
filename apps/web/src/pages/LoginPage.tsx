import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { loginRequestSchema, type LoginRequest } from "@orderflow/contracts";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { ErrorMessage } from "../components/ErrorMessage";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginRequest) => {
    setSubmitError(null);
    try {
      await login(data);
      void navigate(from, { replace: true });
    } catch (error) {
      setSubmitError(error);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby="login-intro-title">
        <div className={styles.brandLockup}>
          <div className={styles.brandMark} aria-hidden="true">
            OF
          </div>
          <span>OrderFlow Operations</span>
        </div>
        <div className={styles.portfolioBadge}>Production-like portfolio MVP</div>
        <h1 id="login-intro-title" className={styles.introTitle}>
          Commercial operations, without the blind spots.
        </h1>
        <p className={styles.introCopy}>
          Coordinate customers, inventory, orders, and reliable Demo ERP synchronization in one
          focused workspace.
        </p>
        <ul className={styles.capabilities}>
          <li>Transactional stock reservations</li>
          <li>Idempotent order processing</li>
          <li>Auditable ERP synchronization</li>
        </ul>
      </section>

      <main className={styles.card}>
        <div className={styles.header}>
          <div className={styles.eyebrow}>Secure workspace</div>
          <h2 className={styles.logo}>Welcome back</h2>
          <p className={styles.subtitle}>Sign in with your local demo credentials to continue.</p>
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          noValidate
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register("password")}
          />

          {submitError ? <ErrorMessage error={submitError} title="Login failed" /> : null}

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className={styles.footer}>Your session is protected by an HTTP-only cookie.</p>
      </main>
    </div>
  );
}
