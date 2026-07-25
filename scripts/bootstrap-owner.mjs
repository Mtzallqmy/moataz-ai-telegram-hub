import { createClient } from "@supabase/supabase-js";

function required(name, value) {
  if (!value?.trim()) throw new Error(`${name} is required for owner bootstrap`);
  return value.trim();
}

function firstOwnerEmail() {
  return (process.env.OWNER_BOOTSTRAP_EMAIL ?? process.env.PLATFORM_OWNER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .find(Boolean);
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Owner lookup exceeded the supported user page limit");
}

async function main() {
  const password = process.env.OWNER_BOOTSTRAP_PASSWORD?.trim();
  if (!password) {
    console.log("Owner bootstrap password is not configured; skipping.");
    return;
  }
  if (password.length < 8) throw new Error("OWNER_BOOTSTRAP_PASSWORD must contain at least 8 characters");

  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const secret = required(
    "SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const email = required("OWNER_BOOTSTRAP_EMAIL", firstOwnerEmail()).toLowerCase();
  const username = (process.env.OWNER_BOOTSTRAP_USERNAME ?? email.split("@")[0])
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 32);
  const displayName = (process.env.OWNER_BOOTSTRAP_DISPLAY_NAME ?? "معتز العلقمي").trim();
  const forceReset = process.env.OWNER_BOOTSTRAP_FORCE_RESET === "true";

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let user = await findUserByEmail(admin, email);
  const alreadyBootstrapped = user?.app_metadata?.owner_bootstrap_complete === true;

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        preferred_username: username,
        full_name: displayName,
      },
      app_metadata: { role: "owner" },
    });
    if (error || !data.user) throw error ?? new Error("Owner user creation returned no user");
    user = data.user;
  } else {
    const attributes = {
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        username,
        preferred_username: username,
        full_name: displayName,
      },
      app_metadata: {
        ...user.app_metadata,
        role: "owner",
      },
    };
    if (!alreadyBootstrapped || forceReset) attributes.password = password;

    const { data, error } = await admin.auth.admin.updateUserById(user.id, attributes);
    if (error || !data.user) throw error ?? new Error("Owner user update returned no user");
    user = data.user;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    username,
    display_name: displayName,
    account_status: "active",
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  const { data: ownerRole, error: roleError } = await admin
    .from("roles")
    .select("id")
    .eq("name", "owner")
    .single();
  if (roleError || !ownerRole) throw roleError ?? new Error("Owner role is missing");

  const { error: assignmentError } = await admin.from("user_roles").upsert(
    {
      user_id: user.id,
      role_id: ownerRole.id,
      assigned_by: user.id,
    },
    { onConflict: "user_id,role_id", ignoreDuplicates: false },
  );
  if (assignmentError) throw assignmentError;

  const { error: markerError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      role: "owner",
      owner_bootstrap_complete: true,
      owner_bootstrap_completed_at: new Date().toISOString(),
    },
  });
  if (markerError) throw markerError;

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "owner.bootstrap",
    resource_type: "auth_user",
    resource_id: user.id,
    metadata: {
      source: "railway_startup",
      password_reset: !alreadyBootstrapped || forceReset,
    },
  });

  console.log(`Owner bootstrap completed for ${email}.`);
}

main().catch((error) => {
  const safeMessage = error instanceof Error ? error.message : "Unknown owner bootstrap failure";
  console.error(`Owner bootstrap failed: ${safeMessage}`);
  process.exit(1);
});
