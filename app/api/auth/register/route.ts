// app/api/auth/register/route.ts
import { supabase } from "../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const body     = await req.json().catch(() => null);
    const name     = (body?.name     ?? "").trim();
    const email    = (body?.email    ?? "").trim().toLowerCase();
    const password = (body?.password ?? "").trim();

    if (!name)                          return Response.json({ error: "Name is required."          }, { status: 400 });
    if (!email || !email.includes("@")) return Response.json({ error: "Valid email required."      }, { status: 400 });
    if (password.length < 8)            return Response.json({ error: "Password must be 8+ chars." }, { status: 400 });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) return Response.json({ error: error.message }, { status: 400 });

    if (data.user) {
      await supabase.from("profiles").update({ name }).eq("id", data.user.id);
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[/api/auth/register]", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}