// eduverse-recover-master v2 — handles existing users
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RECOVERY_SECRET = Deno.env.get("EDUVERSE_MASTER_ADMIN_RECOVERY_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const traceId = crypto.randomUUID();
  try {
    const { recoverySecret, newEmail, newPassword } = (await req.json()) as {
      recoverySecret?: string;
      newEmail?: string;
      newPassword?: string;
    };

    if (!RECOVERY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Recovery secret not configured in backend", traceId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (recoverySecret !== RECOVERY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Invalid recovery secret", traceId }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newEmail || !newEmail.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email required", traceId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters", traceId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to create the user; if already exists, update instead
    let userId: string;

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: newEmail.toLowerCase(),
      password: newPassword,
      email_confirm: true,
      user_metadata: { created_via: "master_recovery" },
    });

    if (createErr) {
      // User already exists — look them up and update password
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = listData?.users?.find(
        (u) => u.email?.toLowerCase() === newEmail.toLowerCase()
      );

      if (!existing) {
        return new Response(
          JSON.stringify({ error: "User not found and could not be created: " + createErr.message, traceId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = existing.id;

      // Update password & confirm email
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true,
        user_metadata: { ...(existing.user_metadata ?? {}), recovered_via: "master_recovery" },
      });

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: updateErr.message, traceId }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      if (!newUser?.user?.id) {
        return new Response(
          JSON.stringify({ error: "User creation failed", traceId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = newUser.user.id;
    }

    // Upsert platform_super_admins
    const { error: psaErr } = await supabaseAdmin
      .from("platform_super_admins")
      .upsert({ user_id: userId }, { onConflict: "user_id" });

    if (psaErr) {
      return new Response(
        JSON.stringify({ error: psaErr.message, traceId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert profiles
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: userId, display_name: "Master Admin" }, { onConflict: "user_id" });

    if (profileErr) {
      return new Response(
        JSON.stringify({ error: profileErr.message, traceId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      action: "master_admin_recovery",
      entity_type: "auth_user",
      entity_id: userId,
      actor_user_id: null,
      school_id: null,
      metadata: { newEmail, recoveredVia: "recovery_secret", traceId },
    });

    return new Response(
      JSON.stringify({
        success: true,
        email: newEmail,
        message: "Master admin created. You can now sign in at /auth",
        traceId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, traceId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});