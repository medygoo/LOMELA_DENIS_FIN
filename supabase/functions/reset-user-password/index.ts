import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "0123456789";
  const letter = chars[Math.floor(Math.random() * chars.length)];
  const num = Array.from({ length: 6 }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
  const suffix = chars[Math.floor(Math.random() * chars.length)];
  return `Ss-${num}-${letter}${suffix}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "ID utilisateur requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the caller's identity
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: callerUser, error: callerError } = await supabase.auth.getUser(token);

    if (callerError || !callerUser?.user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = callerUser.user.id;

    // Get caller's profile
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("school_id, is_active")
      .eq("id", callerId)
      .maybeSingle();

    if (!callerProfile || !callerProfile.school_id) {
      return new Response(
        JSON.stringify({ error: "Profil administrateur introuvable" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller has admin_principal or direction role
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("school_id", callerProfile.school_id)
      .eq("is_active", true);

    const hasAdminAccess = callerRoles?.some(
      (r: { role: string }) => r.role === "admin_principal" || r.role === "direction"
    );

    if (!hasAdminAccess) {
      return new Response(
        JSON.stringify({ error: "Vous n'avez pas l'autorisation de réinitialiser les mots de passe" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user's profile — must be in the same school
    const { data: targetProfile, error: targetErr } = await supabase
      .from("profiles")
      .select("id, email, school_id")
      .eq("id", userId)
      .eq("school_id", callerProfile.school_id)
      .maybeSingle();

    if (targetErr || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "Utilisateur introuvable dans votre école" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new temporary password
    const tempPassword = generateTempPassword();

    // Update password in Supabase Auth
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Erreur lors de la réinitialisation du mot de passe: " + updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set must_change_password = true
    await supabase
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);

    // Try to revoke existing sessions (sign out all sessions)
    // Supabase admin API doesn't have a direct "revoke all sessions" endpoint,
    // but we can sign out by updating the user which invalidates tokens
    try {
      await supabase.auth.admin.signOut(userId, "global");
    } catch {
      // signOut may not be available in all versions — non-fatal
    }

    // Audit log
    await supabase.rpc("audit_action", {
      p_action: "password_reset",
      p_entity_type: "profile",
      p_entity_id: userId,
      p_details: { reset_by: callerId, user_email: targetProfile.email },
    });

    return new Response(
      JSON.stringify({
        success: true,
        temporaryPassword: tempPassword,
        email: targetProfile.email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Erreur serveur",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
