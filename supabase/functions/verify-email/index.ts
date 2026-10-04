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

    // Find the latest unused, non-expired verification code
    const now = new Date().toISOString();
    const { data: verification, error: verError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("user_id", profile.id)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verError || !verification) {
      return new Response(
        JSON.stringify({ error: "Code de vérification invalide ou expiré" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark code as used
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
