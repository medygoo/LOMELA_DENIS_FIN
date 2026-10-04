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
    const {
      schoolName,
      schoolCode,
      city,
      phone,
      yearName,
      yearStart,
      yearEnd,
      firstName,
      lastName,
      email,
      password,
    } = await req.json();

    if (!schoolName || !schoolCode || !email || !password || !yearName) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if school code already exists
    const { data: existingSchool } = await supabase
      .from("schools")
      .select("id")
      .eq("code", schoolCode)
      .maybeSingle();

    if (existingSchool) {
      return new Response(
        JSON.stringify({ error: "Ce code d'école existe déjà" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Un compte avec cet email existe déjà" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create school
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({
        name: schoolName,
        code: schoolCode,
        city: city || null,
        phone: phone || null,
      })
      .select()
      .single();

    if (schoolError) {
      return new Response(
        JSON.stringify({ error: schoolError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create school year
    const { error: yearError } = await supabase
      .from("school_years")
      .insert({
        school_id: school.id,
        name: yearName,
        start_date: yearStart,
        end_date: yearEnd,
        is_current: true,
      });

    if (yearError) {
      console.error("year error:", yearError);
    }

    // Create admin user via Supabase Auth admin
    const { data: authUser, error: authError } = await supabase.auth.admin
      .createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "admin_principal",
          school_id: school.id,
        },
      });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile directly (in case trigger doesn't fire)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: authUser.user.id,
        school_id: school.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: "admin_principal",
        is_active: true,
      });

    if (profileError) {
      console.error("profile error:", profileError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        schoolId: school.id,
        userId: authUser.user.id,
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
