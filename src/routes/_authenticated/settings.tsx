import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/settings")({
  beforeLoad: async ({ context }) => {
    if (context.user?.email !== "ecellniet@niet.co.in") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Settings — NIET FormHub" },
      { name: "description", content: "Manage team members, change password and settings on NIET FormHub." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  // User management state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const [sendingReset, setSendingReset] = useState(false);
  // const [forgotMode, setForgotMode] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_get_users");
      if (error) throw error;
      return (data ?? []) as ManagedUser[];
    },
  });

  const userCount = usersQuery.data?.length ?? 0;
  const isLimitReached = userCount >= 10;

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if ((usersQuery.data?.length ?? 0) >= 10) {
        throw new Error("Maximum user limit of 10 reached. Please delete an existing member first.");
      }
      const { error } = await (supabase as any).rpc("admin_create_user", {
        new_name: newUserName,
        new_email: newUserEmail,
        new_password: newUserPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("New user created successfully");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any).rpc("admin_delete_user", {
        target_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setUserToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    if (isOtpMode) {
      if (!enteredOtp || !enteredOtp.trim()) {
        toast.error("Please enter the 6-digit OTP.");
        return;
      }
    } else if (!isRecoveryMode) {
      if (!oldPassword) {
        toast.error("Please enter your current old password.");
        return;
      }
      if (oldPassword === newPassword) {
        toast.error("New password must be different from old password.");
        return;
      }
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      if (isOtpMode) {
        // 1. Verify dynamic OTP with Supabase
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: user.email!,
          token: enteredOtp.trim(),
          type: "recovery",
        });

        if (otpError) {
          toast.error("Wrong OTP");
          setUpdatingPassword(false);
          return;
        }
      } else if (!isRecoveryMode) {
        // Normal old password verification
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: oldPassword,
        });

        if (verifyError) {
          throw new Error("Incorrect old password. Please verify and try again.");
        }
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password changed successfully!");
      setOldPassword("");
      setEnteredOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setIsOtpMode(false);
      setIsRecoveryMode(false);
      if (typeof window !== "undefined" && window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleSendOtp() {
    if (!user.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      toast.success(`A 6-digit OTP has been sent to ${user.email}`);
      setIsOtpMode(true);
      setOldPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      {/* NAVIGATION BACK */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/dashboard" className="flex items-center gap-1.5">
            <ArrowLeft className="size-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* HEADER SECTION */}
      <div className="flex items-center gap-3 border-b pb-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SettingsIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage your team members and account security.
          </p>
        </div>
      </div>

      {/* SEPARATE TABS / VIEWS */}
      <Tabs defaultValue="team" className="mt-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="size-4" /> Team Members ({userCount}/10)
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <KeyRound className="size-4" /> Change Password
          </TabsTrigger>
        </TabsList>

        {/* 1. SEPARATE VIEW: TEAM MEMBERS */}
        <TabsContent value="team" className="mt-6 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">Active Team Members</CardTitle>
                  <Badge variant={isLimitReached ? "destructive" : "secondary"}>
                    {userCount} / 10
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  {isLimitReached
                    ? "Maximum limit of 10 users reached. Delete an existing user to add someone new."
                    : "Create login credentials for team members or remove them (Max 10 users)."}
                </CardDescription>
              </div>
              <Button
                onClick={() => setUserModalOpen(true)}
                disabled={isLimitReached}
                className="flex items-center gap-2"
              >
                <UserPlus className="size-4" />
                {isLimitReached ? "Limit Reached" : "Add New User"}
              </Button>
            </CardHeader>
            <CardContent>
              {usersQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-12">
                  <Loader2 className="size-4 animate-spin" /> Loading team users…
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(usersQuery.data ?? []).map((u) => {
                        const isSelf = u.id === user.id;
                        const isProtectedAdmin = u.email === "ecellniet@niet.co.in";
                        const isProtected = isSelf || isProtectedAdmin;
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name || "—"}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {new Date(u.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {isSelf ? (
                                <Badge className="flex w-fit items-center gap-1 bg-red-600 text-white">
                                  <Shield className="size-3" /> Admin (You)
                                </Badge>
                              ) : isProtectedAdmin ? (
                                <Badge className="flex w-fit items-center gap-1 bg-red-600 text-white">
                                  <Shield className="size-3" /> Admin
                                </Badge>
                              ) : (
                                <Badge variant="secondary">User</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isProtected ? (
                                <span className="text-muted-foreground text-xs italic">Protected</span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => setUserToDelete(u)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. SEPARATE VIEW: CHANGE PASSWORD */}
        <TabsContent value="password" className="mt-6">
          <Card className="shadow-sm max-w-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2">
                <KeyRound className="size-5 text-primary" /> Change Password
              </CardTitle>
              <CardDescription>
                Update your account password. Enter your current password and set a new one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {isRecoveryMode ? (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-primary leading-relaxed">
                    🔑 <strong>Password Reset Mode:</strong> You arrived via a password reset email link. Enter your new password below (no old password required).
                  </div>
                ) : isOtpMode ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="otp-input">Verification OTP</Label>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">Sent to {user.email}</span>
                    </div>
                    <Input
                      id="otp-input"
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      required
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                    />
                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingReset}
                        className="text-xs text-primary hover:underline font-medium cursor-pointer"
                      >
                        {sendingReset ? "Resending OTP…" : "Resend OTP"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtpMode(false);
                          setEnteredOtp("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                      >
                        Use Old Password
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="old-password">Old Password</Label>
                    <Input
                      id="old-password"
                      type="password"
                      placeholder="Enter current password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                    {/* Forgot Password link under old password */}
                    <div className="text-right pt-0.5">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingReset}
                        className="text-xs text-primary hover:underline font-medium cursor-pointer"
                      >
                        {sendingReset ? "Sending OTP…" : "Forgot password?"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password (min. 6 characters)"
                    minLength={6}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                {/* 3. Confirm New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter new password"
                    minLength={6}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={updatingPassword} className="w-full mt-2">
                  {updatingPassword && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE USER MODAL */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create login credentials for a new team member. They can immediately log in with this email and password.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUserMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Rahul Sharma"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@niet.co.in"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="At least 6 characters"
                minLength={6}
                required
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE USER CONFIRMATION */}
      <AlertDialog open={!!userToDelete} onOpenChange={(o) => !o && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user <strong>{userToDelete?.name || userToDelete?.email}</strong>? They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (userToDelete) deleteUserMutation.mutate(userToDelete.id);
              }}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
