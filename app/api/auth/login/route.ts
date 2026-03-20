// app/api/auth/login/route.ts
import { supabase } from "../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const body     = await req.json().catch(() => null);
    const email    = (body?.email    ?? "").trim().toLowerCase();
    const password = (body?.password ?? "").trim();

    if (!email || !password) return Response.json({ error: "Email and password are required." }, { status: 400 });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return Response.json({ error: "Invalid email or password." }, { status: 401 });

    return Response.json({
      success: true,
      user: { id: data.user.id, email: data.user.email },
      session: data.session,
    });
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}