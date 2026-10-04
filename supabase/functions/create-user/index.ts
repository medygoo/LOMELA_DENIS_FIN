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
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  const letter = chars[arr[0] % chars.length];
  const num = Array.from({ length: 6 }, (_, i) => digits[arr[i + 1] % digits.length]).join("");
  const suffix = chars[arr[7] % chars.length];
  return `Ss-${num}-${letter}${suffix}`;
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, "");
  if (p.startsWith("0")) {
    p = "+243" + p.substring(1);
  }
  if (!p.startsWith("+")) {
    p = "+243" + p;
  }
  return p;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      function: userFunction,
      matricule,
      hireDate,
      roles,
    } = await req.json();

    if (!firstName || !lastName || !roles || !Array.isArray(roles) || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Prénom, nom et au moins un rôle sont obligatoires" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email && !phone) {
      return new Response(
        JSON.stringify({ error: "Au moins un moyen de connexion est requis (email ou téléphone)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the caller's identity from the JWT
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
    const { data: callerProfile, error: profErr } = await supabase
      .from("profiles")
      .select("school_id, is_active")
      .eq("id", callerId)
      .maybeSingle();

    if (profErr || !callerProfile || !callerProfile.school_id) {
      return new Response(
        JSON.stringify({ error: "Profil administrateur introuvable" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller has admin_principal role ONLY (not direction)
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("school_id", callerProfile.school_id)
      .eq("is_active", true);

    const isAdminPrincipal = callerRoles?.some(
      (r: { role: string }) => r.role === "admin_principal"
    );

    if (!isAdminPrincipal) {
      return new Response(
        JSON.stringify({ error: "Seul l'administrateur principal peut créer des utilisateurs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const schoolId = callerProfile.school_id;
    const normalizedPhone = phone ? normalizePhone(phone) : undefined;

    // Check if email already exists (if email provided)
    if (email) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "Un compte avec cet email existe déjà" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if phone already exists (if phone provided)
    if (normalizedPhone) {
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (existingPhone) {
        return new Response(
          JSON.stringify({ error: "Un compte avec ce téléphone existe déjà" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create Supabase Auth user
    // If email provided: create with email. If phone only: create with phone.
    const authParams: Record<string, unknown> = {
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: roles[0],
        school_id: schoolId,
      },
    };

    if (email) {
      authParams.email = email;
    }
    if (normalizedPhone) {
      authParams.phone = normalizedPhone;
      authParams.phone_confirm = true;
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser(
      authParams as Parameters<typeof supabase.auth.admin.createUser>[0]
    );

    if (authError || !authUser.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || "Erreur lors de la création du compte" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authUser.user.id;

    // Create profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      school_id: schoolId,
      email: email || null,
      first_name: firstName,
      last_name: lastName,
      phone: normalizedPhone || null,
      role: roles[0],
      function: userFunction || null,
      matricule: matricule || null,
      hire_date: hireDate || null,
      is_active: true,
      email_verified: true,
      must_change_password: true,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    // Create staff record
    await supabase.from("staff").insert({
      school_id: schoolId,
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: normalizedPhone || null,
      role: roles[0],
      function: userFunction || null,
      matricule: matricule || null,
      hire_date: hireDate || null,
      is_active: true,
    });

    // Create user_roles entries
    for (const role of roles) {
      await supabase.from("user_roles").upsert({
        user_id: userId,
        school_id: schoolId,
        role,
        is_active: true,
      });
    }

    // Audit log
    await supabase.rpc("audit_action", {
      p_action: "user_created",
      p_entity_type: "profile",
      p_entity_id: userId,
      p_details: {
        email: email || null,
        phone: normalizedPhone || null,
        first_name: firstName,
        last_name: lastName,
        roles,
        created_by: callerId,
      },
    });

    await supabase.rpc("audit_action", {
      p_action: "roles_assigned",
      p_entity_type: "user_roles",
      p_entity_id: userId,
      p_details: { roles, assigned_by: callerId },
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        temporaryPassword: tempPassword,
        email: email || null,
        phone: normalizedPhone || null,
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
