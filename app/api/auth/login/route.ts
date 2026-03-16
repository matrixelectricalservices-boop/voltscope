// app/api/auth/login/route.ts
//
// CURRENT STATE: stub — accepts any valid-looking credentials, redirects to dashboard.
// NEXT STEP: replace the TODO block with real DB lookup + password check.
//
// What this will need when you add a database:
//   1. Look up user by email
//   2. Compare password with stored hash using bcrypt.compare()
//   3. Create a session (JWT cookie or server session)
//   4. Return session token / set HttpOnly cookie
//
// Recommended auth library for Next.js:
//   npm install next-auth  (easiest — handles sessions, JWTs, OAuth)
//   OR roll your own with jose (JWT) + cookies

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const email    = (body?.email    ?? "").trim().toLowerCase();
    const password = (body?.password ?? "").trim();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }

    // ── TODO: replace this block with real DB logic ──────────────────────────
    //
    // import bcrypt from "bcryptjs";
    // import { db } from "@/lib/db";
    //
    // const user = await db.user.findUnique({ where: { email } });
    // if (!user) return Response.json({ error: "Invalid email or password." }, { status: 401 });
    //
    // const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    // if (!passwordMatch) return Response.json({ error: "Invalid email or password." }, { status: 401 });
    //
    // // Create session token (example with NextAuth or jose)
    // const token = await createSessionToken({ userId: user.id, email: user.email });
    //
    // const response = Response.json({ success: true });
    // response.headers.set("Set-Cookie", `vs_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`);
    // return response;
    //
    // ── End TODO ─────────────────────────────────────────────────────────────

    console.log("[/api/auth/login] stub — would authenticate:", email);

    // Stub: return success so the UI redirect to /dashboard works during dev
    return Response.json({ success: true, user: { email } }, { status: 200 });

  } catch (err: unknown) {
    console.error("[/api/auth/login] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}