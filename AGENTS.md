<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Roles live in `public.user_roles` (checked via `has_role`); the first account to sign up becomes admin — why: avoids privilege escalation and bootstraps the first official without manual SQL.
- Signed-in pages live under `src/routes/_authenticated/` and read data with the browser client under RLS; the layout renders `AppShell` — why: one gate and one shell for all member pages.
- Complaint status changes happen only by inserting a `complaint_updates` row with `new_status` (trigger applies it for admins) — why: every status change leaves a timeline entry.
