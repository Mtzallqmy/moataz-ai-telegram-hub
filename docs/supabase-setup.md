# Supabase setup

Create or select one project, apply `supabase/migrations/202607220001_initial_auth_rbac.sql`, and enable Google and GitHub under Authentication providers. Add the project URL and publishable key to browser-visible variables. Keep the service-role key server-only. Configure the private `user-uploads` bucket through the migration; paths must begin with the authenticated user ID.

Add redirect URLs for `http://localhost:3000/auth/callback`, every approved Vercel preview pattern, the Vercel production domain, the Sites production domain, and the custom domain. Avoid wildcards broader than the deployment platform requires.
