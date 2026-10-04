import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email et code requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find the user by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email_verified")
      .eq("email", email)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Aucun compte trouvé avec cet email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.email_verified) {
      return new Response(
        JSON.stringify({ success: true, alreadyVerified: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the latest unused, non-expired, non-invalidated verification code
    const now = new Date().toISOString();
    const { data: verification, error: verError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("user_id", profile.id)
      .eq("code", code)
      .eq("used", false)
      .eq("invalidated", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verError || !verification) {
      // Check if there's an active code — increment its attempts
      const { data: activeCode } = await supabase
        .from("email_verifications")
        .select("*")
        .eq("user_id", profile.id)
        .eq("used", false)
        .eq("invalidated", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeCode) {
        const newAttempts = (activeCode.attempts || 0) + 1;
        const maxAttempts = activeCode.max_attempts || 5;

        if (newAttempts >= maxAttempts) {
          // Invalidate this code — too many attempts
          await supabase
            .from("email_verifications")
            .update({ invalidated: true })
            .eq("id", activeCode.id);

          return new Response(
            JSON.stringify({ error: "Trop de tentatives incorrectes. Demandez un nouveau code." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("email_verifications")
          .update({ attempts: newAttempts })
          .eq("id", activeCode.id);

        const remaining = maxAttempts - newAttempts;
        return new Response(
          JSON.stringify({ error: `Code incorrect. ${remaining} tentative(s) restante(s).` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Code de vérification invalide, expiré ou déjà utilisé. Demandez un nouveau code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempt limit (even on correct code, verify attempts haven't been exhausted)
    if (verification.attempts >= (verification.max_attempts || 5)) {
      await supabase
        .from("email_verifications")
        .update({ invalidated: true })
        .eq("id", verification.id);
      return new Response(
        JSON.stringify({ error: "Trop de tentatives incorrectes. Demandez un nouveau code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark code as used (single use)
    await supabase
      .from("email_verifications")
      .update({ used: true })
      .eq("id", verification.id);

    // Mark email as verified in profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", profile.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Erreur lors de la vérification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Confirm email in Supabase Auth
    await supabase.auth.admin.updateUserById(profile.id, {
      email_confirm: true,
    });

    return new Response(
      JSON.stringify({ success: true, verified: true }),
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
