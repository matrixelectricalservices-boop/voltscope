// app/api/auth/register/route.ts
//
// CURRENT STATE: stub — stores nothing, returns success so the UI works.
// NEXT STEP: replace the TODO block with a real DB insert (Supabase, Prisma, etc.)
//
// What this will need when you add a database:
//   1. Check if email already exists
//   2. Hash the password with bcrypt
//   3. Insert { name, email, passwordHash, createdAt } into your users table
//   4. Return a session token or set a cookie
//
// Install when ready:
//   npm install bcryptjs
//   npm install --save-dev @types/bcryptjs

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const name     = (body?.name     ?? "").trim();
    const email    = (body?.email    ?? "").trim().toLowerCase();
    const password = (body?.password ?? "").trim();

    // Basic validation
    if (!name)                   return Response.json({ error: "Name is required."            }, { status: 400 });
    if (!email || !email.includes("@")) return Response.json({ error: "Valid email required." }, { status: 400 });
    if (password.length < 8)     return Response.json({ error: "Password must be 8+ chars."   }, { status: 400 });

    // ── TODO: replace this block with real DB logic ──────────────────────────
    //
    // import bcrypt from "bcryptjs";
    // import { db } from "@/lib/db";  // your DB client
    //
    // const existing = await db.user.findUnique({ where: { email } });
    // if (existing) return Response.json({ error: "Email already in use." }, { status: 409 });
    //
    // const passwordHash = await bcrypt.hash(password, 12);
    // const user = await db.user.create({
    //   data: { name, email, passwordHash, createdAt: new Date() },
    // });
    //
    // ── End TODO ─────────────────────────────────────────────────────────────

    console.log("[/api/auth/register] stub — would create user:", { name, email });

    return Response.json({ success: true, message: "Account created." }, { status: 201 });

  } catch (err: unknown) {
    console.error("[/api/auth/register] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}