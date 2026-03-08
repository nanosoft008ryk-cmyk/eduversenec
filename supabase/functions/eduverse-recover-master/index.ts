import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RECOVERY_SECRET = Deno.env.get("EDUVERSE_MASTER_ADMIN_RECOVERY_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const traceId = crypto.randomUUID();

  try {
    const body = await req.json();
    const recoverySecret = body.recoverySecret as string | undefined;
    const newEmail = (body.newEmail as string | undefined)?.trim().toLowerCase();
    const newPassword = body.newPassword as string | undefined;

    if (!RECOVERY_SECRET)
      return json({ error: "Recovery secret not configured in backend", traceId }, 500);
    if (recoverySecret !== RECOVERY_SECRET)
      return json({ error: "Invalid recovery secret", traceId }, 403);
    if (!newEmail || !newEmail.includes("@"))
      return json({ error: "Valid email required", traceId }, 400);
    if (!newPassword || newPassword.length < 8)
      return json({ error: "Password must be at least 8 characters", traceId }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---------- find or create user ----------
    let userId: string;

    // First check if user already exists
    const { data: listData } = await admin.auth.admin.listUsers();
    const existing = listData?.users?.find(
      (u: any) => u.email?.toLowerCase() === newEmail,
    );

    if (existing) {
      // User exists — just reset their password
      userId = existing.id;
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true,
        user_metadata: { ...(existing.user_metadata ?? {}), recovered_via: "master_recovery" },
      });
      if (updErr) return json({ error: updErr.message, traceId }, 500);
    } else {
      // User does not exist — create fresh
      const { data: nu, error: crErr } = await admin.auth.admin.createUser({
        email: newEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { created_via: "master_recovery" },
      });
      if (crErr || !nu?.user?.id)
        return json({ error: crErr?.message ?? "User creation failed", traceId }, 400);
      userId = nu.user.id;
    }

    // ---------- ensure super-admin row ----------
    const { error: psaErr } = await admin
      .from("platform_super_admins")
      .upsert({ user_id: userId }, { onConflict: "user_id" });
    if (psaErr) return json({ error: psaErr.message, traceId }, 500);

    // ---------- ensure profile ----------
    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ user_id: userId, display_name: "Master Admin" }, { onConflict: "user_id" });
    if (profErr) return json({ error: profErr.message, traceId }, 500);

    // ---------- audit ----------
    await admin.from("audit_logs").insert({
      action: "master_admin_recovery",
      entity_type: "auth_user",
      entity_id: userId,
      actor_user_id: null,
      school_id: null,
      metadata: { newEmail, recoveredVia: "recovery_secret", traceId },
    });

    return json({
      success: true,
      email: newEmail,
      message: "Master admin recovered. You can now sign in at /auth",
      traceId,
    });
  } catch (err) {
    return json({ error: (err as Error).message, traceId }, 500);
  }
});
