import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // ---- Step 1: Find existing user or create new one ----
    // First, search for existing user via Admin API REST endpoint directly
    let userId: string | null = null;
    let existed = false;

    // Use the REST API directly to list users filtered by email
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "apikey": SERVICE_ROLE_KEY,
      },
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const users = listData?.users ?? listData ?? [];
      if (Array.isArray(users)) {
        const found = users.find((u: any) => u.email?.toLowerCase() === newEmail);
        if (found) {
          userId = found.id;
          existed = true;
        }
      }
    }

    if (userId && existed) {
      // Update existing user's password
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true,
        user_metadata: { recovered_via: "master_recovery" },
      });
      if (updErr) return json({ error: "Password update failed: " + updErr.message, traceId }, 500);
    } else {
      // Create new user
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: newEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { created_via: "master_recovery" },
      });
      if (createErr) return json({ error: createErr.message, traceId }, 400);
      if (!newUser?.user?.id) return json({ error: "User creation returned no ID", traceId }, 400);
      userId = newUser.user.id;
    }

    // ---- Step 2: Ensure super-admin row ----
    const { error: psaErr } = await admin
      .from("platform_super_admins")
      .upsert({ user_id: userId }, { onConflict: "user_id" });
    if (psaErr) return json({ error: "Super admin upsert: " + psaErr.message, traceId }, 500);

    // ---- Step 3: Ensure profile ----
    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ id: userId, display_name: "Master Admin" }, { onConflict: "id" });
    if (profErr) return json({ error: "Profile upsert: " + profErr.message, traceId }, 500);

    // ---- Step 4: Audit ----
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
      existed: !!createErr,
      message: createErr
        ? "Master admin password updated. Sign in at /auth"
        : "Master admin created. Sign in at /auth",
      traceId,
    });
  } catch (err) {
    return json({ error: (err as Error).message, traceId }, 500);
  }
});
