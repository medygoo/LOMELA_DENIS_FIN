import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Edge function: setup-school
// Creates a new school + admin user with app_metadata (role, school_id)
// Called without authentication (verify_jwt = false)

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const {
      school_name,
      school_code,
      school_address,
      school_city,
      school_phone,
      school_email,
      admin_email,
      admin_password,
      admin_first_name,
      admin_last_name,
      admin_phone,
    } = body;

    if (
      !school_name || !school_code || !admin_email || !admin_password ||
      !admin_first_name || !admin_last_name
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if school code already exists
    const { data: existingSchool } = await adminClient
      .from("schools")
      .select("id")
      .eq("code", school_code)
      .maybeSingle();

    if (existingSchool) {
      return new Response(
        JSON.stringify({ error: "School code already in use" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create school
    const { data: school, error: schoolErr } = await adminClient
      .from("schools")
      .insert({
        name: school_name,
        code: school_code,
        address: school_address || null,
        city: school_city || null,
        phone: school_phone || null,
        email: school_email || null,
        is_active: true,
      })
      .select()
      .single();

    if (schoolErr || !school) {
      return new Response(
        JSON.stringify({ error: "Failed to create school" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create admin user with app_metadata
    const { data: adminUser, error: adminErr } = await adminClient.auth.admin
      .createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true,
        user_metadata: {
          first_name: admin_first_name,
          last_name: admin_last_name,
        },
        app_metadata: {
          role: "admin_principal",
          school_id: school.id,
        },
      });

    if (adminErr || !adminUser) {
      await adminClient.from("schools").delete().eq("id", school.id);
      return new Response(
        JSON.stringify({ error: "Failed to create admin account" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create profile
    const { error: profileErr } = await adminClient
      .from("profiles")
      .insert({
        id: adminUser.user.id,
        school_id: school.id,
        email: admin_email,
        first_name: admin_first_name,
        last_name: admin_last_name,
        phone: admin_phone || null,
        role: "admin_principal",
        is_active: true,
      });

    if (profileErr) {
      await adminClient.auth.admin.deleteUser(adminUser.user.id);
      await adminClient.from("schools").delete().eq("id", school.id);
      return new Response(
        JSON.stringify({ error: "Failed to create admin profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create initial school year
    const currentYear = new Date().getFullYear();
    await adminClient.from("school_years").insert({
      school_id: school.id,
      name: `${currentYear}-${currentYear + 1}`,
      start_date: `${currentYear}-09-01`,
      end_date: `${currentYear + 1}-07-31`,
      is_current: true,
    });

    await adminClient.from("audit_log").insert({
      school_id: school.id,
      actor_id: adminUser.user.id,
      action: "setup_school",
      entity_type: "school",
      entity_id: school.id,
      details: { school_name, school_code },
    });

    return new Response(
      JSON.stringify({
        success: true,
        school_id: school.id,
        admin_user_id: adminUser.user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
