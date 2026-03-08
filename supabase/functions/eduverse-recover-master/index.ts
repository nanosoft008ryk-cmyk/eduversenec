// eduverse-recover-master v4 – email optional, password-only recovery
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const optionalEmail = (body.newEmail as string | undefined)?.trim().toLowerCase();
    const newPassword = body.newPassword as string | undefined;

    if (!RECOVERY_SECRET)
      return json({ error: "Recovery secret not configured in backend", traceId }, 500);
    if (recoverySecret !== RECOVERY_SECRET)
      return json({ error: "Invalid recovery secret", traceId }, 403);
    if (!newPassword || newPassword.length < 8)
      return json({ error: "Password must be at least 8 characters", traceId }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---- Step 1: Find existing super admin(s) or use provided email ----
    let userId: string | null = null;
    let userEmail: string | null = optionalEmail || null;
    let existed = false;

    if (optionalEmail) {
      // Search for user by provided email via REST API
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`, {
        headers: {
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "apikey": SERVICE_ROLE_KEY,
        },
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const users = listData?.users ?? listData ?? [];
        if (Array.isArray(users)) {
          const found = users.find((u: any) => u.email?.toLowerCase() === optionalEmail);
          if (found) {
            userId = found.id;
            userEmail = found.email;
            existed = true;
          }
        }
      }
    } else {
      // No email provided — find the first existing platform super admin
      const { data: superAdmins } = await admin
        .from("platform_super_admins")
        .select("user_id")
        .limit(1);

      if (superAdmins && superAdmins.length > 0) {
        userId = superAdmins[0].user_id;
        existed = true;

        // Get the email for this user
        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          headers: {
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "apikey": SERVICE_ROLE_KEY,
          },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          userEmail = userData?.email ?? null;
        }
      }
    }

    if (userId && existed) {
      // Update existing user's password
      const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "apikey": SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
          email_confirm: true,
          user_metadata: { recovered_via: "master_recovery" },
        }),
      });

      if (!updateRes.ok) {
        const errData = await updateRes.json().catch(() => ({}));
        return json({ error: "Password update failed: " + (errData?.msg || errData?.message || updateRes.statusText), traceId }, 500);
      }
    } else if (optionalEmail) {
      // Create new user with provided email
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "apikey": SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: optionalEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: { created_via: "master_recovery" },
        }),
      });

      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        return json({ error: createData?.msg || createData?.message || "User creation failed", traceId }, 400);
      }
      userId = createData?.id ?? null;
      userEmail = optionalEmail;
    } else {
      return json({ error: "No existing super admin found. Please provide an email to create one.", traceId }, 400);
    }

    if (!userId) return json({ error: "Could not determine user ID", traceId }, 500);

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
      metadata: { email: userEmail, recoveredVia: "recovery_secret", traceId },
    });

    return json({
      success: true,
      email: userEmail,
      existed,
      message: existed
        ? `Password updated for ${userEmail}. Sign in at /auth`
        : `Master admin created with ${userEmail}. Sign in at /auth`,
      traceId,
    });
  } catch (err) {
    return json({ error: (err as Error).message, traceId }, 500);
  }
});
