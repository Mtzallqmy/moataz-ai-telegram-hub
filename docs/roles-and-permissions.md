# Roles and permissions

Default roles are owner, admin, editor, moderator, author, and user. Authorization uses permission codes such as `admin.access`, `users.manage`, and `chat.use`. New accounts receive only `user`. Owner assignment must be performed server-side after comparing the verified account email with `PLATFORM_OWNER_EMAILS`. The database prevents removal of the final owner and audits role changes.
