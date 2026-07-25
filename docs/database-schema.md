# Database schema

The initial migration creates profiles, roles, permissions, user-role mappings, role-permission mappings, user settings, audit and login events, feature flags, platform settings, AI providers, AI models, and encrypted user API-key records. Foreign keys, unique constraints, checks, and indexes enforce integrity. A new-user trigger idempotently creates the profile, settings, and `user` role.
