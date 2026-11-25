import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  CheckCircle2,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NietLogo } from "@/components/NietLogo";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: string | undefined } => ({
    mode: typeof search["mode"] === "string" ? (search["mode"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — NIET FormHub" },
      { name: "description", content: "Log in to your NIET FormHub account to build forms." },
      { property: "og:title", content: "Sign in — NIET FormHub" },
      { property: "og:description", content: "Log in to your NIET FormHub account." },
    ],
  }),
  component: AuthPage,
});

type AuthView = "login" | "forgot";
type ForgotStep = "email" | "otp" | "reset" | "success";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Navigation mode
  const [view, setView] = useState<AuthView>(search.mode === "forgot" ? "forgot" : "login");

  // Login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  // Password validation rules: min 5 chars, at least 2 numbers
  const hasMinLength = newPassword.length >= 5;
  const numMatches = newPassword.match(/\d/g) || [];
  const hasTwoNumbers = numMatches.length >= 2;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Handle standard Login
  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid login credentials");
    } finally {
      setLoginBusy(false);
    }
  }

  // Step 1: Send OTP to registered email
  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setEmailError("Please enter your registered email address.");
      return;
    }

    setForgotBusy(true);
    try {
      // 1. Check if user exists in the database
      const { data: userExists, error: rpcError } = await (supabase as any).rpc("check_user_exists", {
        check_email: cleanEmail,
      });

      if (!rpcError && userExists === false) {
        setEmailError("No account found with this email.");
        toast.error("No account found with this email");
        setForgotBusy(false);
        return;
      }

      // 2. Request Password Reset OTP from Supabase
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (resetError) {
        const errorMsg = (resetError.message || "").toLowerCase();
        if (
          errorMsg.includes("not found") ||
          errorMsg.includes("no user") ||
          errorMsg.includes("not registered") ||
          errorMsg.includes("unable to validate")
        ) {
          setEmailError("No account found with this email.");
          toast.error("No account found with this email");
          return;
        }
        throw resetError;
      }

      toast.success(`OTP sent to ${cleanEmail}. Check your inbox & spam folder.`);
      setForgotStep("otp");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setForgotBusy(false);
    }
  }

  // Step 2: Verify OTP
  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      toast.error("Please enter the 6-digit OTP.");
      return;
    }

    setForgotBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim().toLowerCase(),
        token: cleanOtp,
        type: "recovery",
      });

      if (error) {
        toast.error("Wrong OTP. Please enter the correct code.");
        return;
      }

      toast.success("OTP verified successfully!");
      setForgotStep("reset");
    } catch (err: any) {
      toast.error(err?.message || "Wrong OTP");
    } finally {
      setForgotBusy(false);
    }
  }

  // Step 3: Set and Confirm New Password (min 5 characters, >= 2 numbers)
  async function onSetNewPassword(e: React.FormEvent) {
    e.preventDefault();

    if (!hasMinLength) {
      toast.error("Password must be at least 5 characters long.");
      return;
    }

    if (!hasTwoNumbers) {
      toast.error("Password must contain at least 2 numbers (digits).");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setForgotBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Sign out recovery session so user can log in fresh
      await supabase.auth.signOut();

      toast.success("Password reset successfully!");
      setForgotStep("success");
    } catch (err: any) {
      toast.error(err?.message || "Failed to set new password. Please try again.");
    } finally {
      setForgotBusy(false);
    }
  }

  // Reset forgot password state and return to login
  function resetToLogin() {
    setView("login");
    setForgotStep("email");
    setEmailError("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    if (forgotEmail) {
      setEmail(forgotEmail);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        {/* TOP NAVIGATION LINK */}
        <div className="mb-6 flex items-center justify-between">
          {view === "login" ? (
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              ← Back to NIET E-CELL FormHub
            </Link>
          ) : (
            <button
              type="button"
              onClick={resetToLogin}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="size-4" /> Back to Log in
            </button>
          )}
        </div>

        <Card className="border-primary/20 shadow-md">
          <CardHeader className="space-y-3">
            <div className="pb-1">
              <NietLogo logoHeightClass="h-14 sm:h-16" />
            </div>

            {view === "login" && (
              <>
                <CardTitle className="text-2xl">Log in</CardTitle>
                <CardDescription>
                  Access your private NIET FormHub dashboard.
                </CardDescription>
              </>
            )}

            {view === "forgot" && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <KeyRound className="size-4" />
                  </div>
                  <CardTitle className="text-2xl">
                    {forgotStep === "email" && "Forgot Password"}
                    {forgotStep === "otp" && "Verify OTP"}
                    {forgotStep === "reset" && "Set New Password"}
                    {forgotStep === "success" && "Password Reset"}
                  </CardTitle>
                </div>
                <CardDescription>
                  {forgotStep === "email" &&
                    "Enter your registered email address to receive a verification OTP."}
                  {forgotStep === "otp" &&
                    `Enter the 6-digit code sent to ${forgotEmail}.`}
                  {forgotStep === "reset" &&
                    "Choose a new password (min. 5 characters with at least 2 numbers)."}
                  {forgotStep === "success" &&
                    "Your new password is now active. You can log in."}
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {/* VIEW 1: LOGIN */}
            {view === "login" && (
              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setView("forgot");
                        setForgotStep("email");
                      }}
                      className="text-xs text-primary hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loginBusy}>
                  {loginBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Log in
                </Button>
              </form>
            )}

            {/* VIEW 2: FORGOT PASSWORD FLOW */}
            {view === "forgot" && (
              <>
                {/* STEP 1: ENTER REGISTERED EMAIL */}
                {forgotStep === "email" && (
                  <form onSubmit={onSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-email">Registered Email</Label>
                      <div className="relative">
                        <Input
                          id="forgot-email"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            setEmailError("");
                          }}
                          placeholder="e.g. ecellniet@niet.co.in"
                          className={emailError ? "border-destructive" : ""}
                        />
                      </div>
                      {emailError && (
                        <div className="flex items-center gap-1.5 text-destructive text-xs pt-1">
                          <AlertCircle className="size-3.5 shrink-0" />
                          <span>{emailError}</span>
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={forgotBusy}>
                      {forgotBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Send OTP
                    </Button>
                  </form>
                )}

                {/* STEP 2: ENTER OTP */}
                {forgotStep === "otp" && (
                  <form onSubmit={onVerifyOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="otp">6-Digit OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className="text-center tracking-widest text-lg font-mono"
                        autoFocus
                      />
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={onSendOtp}
                          disabled={forgotBusy}
                          className="text-xs text-primary hover:underline font-medium cursor-pointer"
                        >
                          Resend OTP
                        </button>
                        <button
                          type="button"
                          onClick={() => setForgotStep("email")}
                          className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                        >
                          Change Email
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={forgotBusy || otp.length < 6}>
                      {forgotBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Verify OTP
                    </Button>
                  </form>
                )}

                {/* STEP 3: SET NEW PASSWORD & CONFIRM NEW PASSWORD */}
                {forgotStep === "reset" && (
                  <form onSubmit={onSetNewPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* LIVE VALIDATION CHECKLIST */}
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5 text-xs">
                      <p className="font-semibold text-muted-foreground pb-0.5">Password Requirements:</p>
                      <div className="flex items-center gap-2">
                        {hasMinLength ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <X className="size-3.5 text-muted-foreground" />
                        )}
                        <span className={hasMinLength ? "text-foreground font-medium" : "text-muted-foreground"}>
                          At least 5 characters (current: {newPassword.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasTwoNumbers ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <X className="size-3.5 text-muted-foreground" />
                        )}
                        <span className={hasTwoNumbers ? "text-foreground font-medium" : "text-muted-foreground"}>
                          At least 2 numbers / digits (current: {numMatches.length}/2)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordsMatch ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <X className="size-3.5 text-muted-foreground" />
                        )}
                        <span className={passwordsMatch ? "text-foreground font-medium" : "text-muted-foreground"}>
                          Passwords match
                        </span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={forgotBusy || !hasMinLength || !hasTwoNumbers || !passwordsMatch}
                    >
                      {forgotBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Set New Password
                    </Button>
                  </form>
                )}

                {/* STEP 4: SUCCESS - SHOW LOGIN BUTTON AND REDIRECT */}
                {forgotStep === "success" && (
                  <div className="space-y-6 text-center py-3">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-bold text-white">Password Changed!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your password has been reset successfully. You can now log in with your new password.
                      </p>
                    </div>

                    <Button
                      type="button"
                      className="w-full shadow-lg shadow-primary/30 hover:shadow-primary/50"
                      onClick={resetToLogin}
                    >
                      Log in
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
