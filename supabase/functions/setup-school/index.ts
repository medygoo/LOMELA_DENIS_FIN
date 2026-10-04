import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateSchoolCode(name: string): string {
  const prefix = name.replace(/[^A-Za-z]/g, "").substring(0, 3).toUpperCase().padEnd(3, "X");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      schoolName,
      schoolShortName,
      levels,
      country,
      city,
      commune,
      address,
      phone,
      schoolEmail,
      yearName,
      yearStart,
      yearEnd,
      firstName,
      lastName,
      function: userFunction,
      adminPhone,
      email,
      password,
      passwordConfirm,
    } = await req.json();

    // --- Validation ---
    if (!schoolName || !email || !password || !yearName || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password !== passwordConfirm) {
      return new Response(
        JSON.stringify({ error: "Les mots de passe ne correspondent pas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- Check if email already exists ---
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Un compte avec cet email existe déjà. Connectez-vous ou utilisez un autre email." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Duplicate school detection: name + city/commune + phone or email ---
    const nameMatch = schoolName.trim().toLowerCase();
    let duplicateQuery = supabase
      .from("schools")
      .select("id, name, city, commune, phone, email")
      .ilike("name", nameMatch);

    if (city) {
      duplicateQuery = duplicateQuery.ilike("city", city.trim());
    }

    const { data: similarSchools } = await duplicateQuery.limit(5);

    if (similarSchools && similarSchools.length > 0) {
      // Check if phone or email also matches
      const probableDuplicate = similarSchools.find((s: Record<string, string | null>) => {
        const phoneMatch = phone && s.phone && s.phone.replace(/\s/g, "") === phone.replace(/\s/g, "");
        const emailMatch = schoolEmail && s.email && s.email.toLowerCase() === schoolEmail.toLowerCase();
        return phoneMatch || emailMatch;
      });

      if (probableDuplicate) {
        return new Response(
          JSON.stringify({
            error: "Cet établissement semble déjà exister. Connectez-vous ou contactez l'administrateur de votre école.",
            duplicate: true,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- Generate unique school code ---
    let schoolCode = generateSchoolCode(schoolName);
    let codeAttempts = 0;
    while (codeAttempts < 10) {
      const { data: codeExists } = await supabase
        .from("schools")
        .select("id")
        .eq("code", schoolCode)
        .maybeSingle();
      if (!codeExists) break;
      schoolCode = generateSchoolCode(schoolName);
      codeAttempts++;
    }

    // --- Create school ---
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({
        name: schoolName,
        code: schoolCode,
        short_name: schoolShortName || null,
        levels: levels || null,
        country: country || null,
        city: city || null,
        commune: commune || null,
        address: address || null,
        phone: phone || null,
        email: schoolEmail || null,
        status: "setup",
        is_active: true,
      })
      .select()
      .single();

    if (schoolError || !school) {
      return new Response(
        JSON.stringify({ error: schoolError?.message || "Erreur lors de la création de l'école" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Create school year ---
    const { error: yearError } = await supabase
      .from("school_years")
      .insert({
        school_id: school.id,
        name: yearName,
        start_date: yearStart || null,
        end_date: yearEnd || null,
        is_current: true,
      });

    if (yearError) {
      // Rollback: delete school
      await supabase.from("schools").delete().eq("id", school.id);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création de l'année scolaire: " + yearError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Determine roles ---
    const roles: string[] = ["admin_principal"];
    if (userFunction === "Directeur") {
      roles.push("direction");
    }

    const primaryRole = roles[0]; // admin_principal

    // --- Create admin user via Supabase Auth admin ---
    // email_confirm: false — user must verify email
    const { data: authUser, error: authError } = await supabase.auth.admin
      .createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: primaryRole,
          school_id: school.id,
        },
      });

    if (authError || !authUser.user) {
      // Rollback: delete school year and school
      await supabase.from("school_years").delete().eq("school_id", school.id);
      await supabase.from("schools").delete().eq("id", school.id);
      return new Response(
        JSON.stringify({ error: authError?.message || "Erreur lors de la création du compte" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authUser.user.id;

    // --- Create profile ---
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        school_id: school.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: adminPhone || null,
        role: primaryRole,
        function: userFunction || null,
        is_active: true,
        email_verified: false,
      });

    if (profileError) {
      console.error("profile error:", profileError);
    }

    // --- Create user_roles entries (multiple roles) ---
    for (const role of roles) {
      await supabase.from("user_roles").upsert({
        user_id: userId,
        school_id: school.id,
        role,
        is_active: true,
      });
    }

    // --- Generate email verification code ---
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await supabase.from("email_verifications").insert({
      user_id: userId,
      code: verificationCode,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    // --- Send verification email via Supabase Auth ---
    // We use resendSignUpEmail which sends the Supabase confirmation email
    // The verification code is also stored in email_verifications for our custom flow
    // Note: Supabase Auth email_confirm was set to false, so the user needs to verify
    // We send both: Supabase's built-in email + our code-based flow
    try {
      // Send Supabase confirmation email
      const res = await fetch(`${supabaseUrl}/auth/v1/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          type: "signup",
          email,
        }),
      });
      if (!res.ok) {
        console.error("Failed to send Supabase email:", await res.text());
      }
    } catch (e) {
      console.error("Email send error:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        schoolId: school.id,
        schoolCode: school.code,
        userId,
        verificationCode, // Return code for dev/testing — in production this would only be in the email
        needsVerification: true,
        email,
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
