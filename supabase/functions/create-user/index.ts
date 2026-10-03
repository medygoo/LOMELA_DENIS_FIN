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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = caller.app_metadata?.role;
    const callerSchoolId = caller.app_metadata?.school_id;

    if (callerRole !== "admin_principal") {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      role,
    } = body;

    if (!email || !password || !first_name || !last_name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const validRoles = [
      "admin_principal",
      "direction",
      "enseignant",
      "parent_tuteur",
      "gardien",
      "caisse",
    ];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: newUserData, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
        },
        app_metadata: {
          role,
          school_id: callerSchoolId,
        },
      });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: newUserData.user.id,
        school_id: callerSchoolId,
        email,
        first_name,
        last_name,
        phone: phone || null,
        role,
        is_active: true,
      });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await adminClient.from("audit_log").insert({
      school_id: callerSchoolId,
      actor_id: caller.id,
      action: "create_user",
      entity_type: "profile",
      entity_id: newUserData.user.id,
      details: { email, role, first_name, last_name },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserData.user.id,
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
