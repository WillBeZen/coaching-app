// ══════════════════════════════════════════════════════════════
//  PaceCoach — Email Notification Edge Function
//  File: supabase/functions/notify-athlete/index.ts
//
//  RECOMMENDED: Deploy via the Supabase Dashboard
//  ──────────────────────────────────────────────
//  1. Go to your Supabase project → Edge Functions
//  2. Click "Deploy a new function" → Via Editor
//  3. Name it: notify-athlete
//  4. Paste this entire file and click Deploy
//  5. Add secrets (Edge Functions → notify-athlete → Secrets):
//     RESEND_API_KEY = re_xxxxxxxxxxxx
//     FROM_EMAIL     = noreply@yourdomain.com
//
//  ALTERNATIVE: Deploy via CLI
//  ──────────────────────────────────────────────
//  Install Supabase CLI (do NOT use npm install -g):
//    Mac:   brew install supabase/tap/supabase
//    Win:   scoop install supabase
//    Linux: npm install supabase --save-dev (local only)
//
//  Then:
//    supabase login
//    supabase link --project-ref YOUR_PROJECT_REF
//    supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//    supabase secrets set FROM_EMAIL=noreply@yourdomain.com
//    supabase functions deploy notify-athlete --no-verify-jwt --use-api
//
//  NOTES:
//  - The --no-verify-jwt flag means the function is callable from the
//    client without a user session. The coach must be signed in (the
//    app only calls this after a successful session.insert), so this
//    is acceptable for a small-team coaching tool.
//  - If you don't deploy this function, PaceCoach works fine — email
//    notifications are silently skipped. No errors shown to the user.
// ══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPE_LABELS: Record<string, string> = {
  easy:      "Easy Run",
  tempo:     "Tempo",
  intervals: "Intervals",
  long:      "Long Run",
  recovery:  "Recovery",
  race:      "Race",
  strength:  "Strength",
  cross:     "Cross Training",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { athleteEmail, athleteName, coachName, session } = await req.json();

    if (!athleteEmail || !session) {
      throw new Error("Missing required fields: athleteEmail, session");
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@pacecoach.app";

    if (!RESEND_KEY) {
      throw new Error("RESEND_API_KEY secret is not set");
    }

    // Format the scheduled date
    const sessionDate = new Date(session.scheduled_date + "T00:00:00");
    const longDate    = sessionDate.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const shortDate   = sessionDate.toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
    });

    const typeLabel = TYPE_LABELS[session.session_type] ?? session.session_type;

    // Build stat rows for the email card
    const statItems = [
      session.distance_km    ? `<td style="padding:0 20px 0 0"><div style="font-family:monospace;font-size:20px;font-weight:700;color:#E8ECF4">${session.distance_km}km</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#4B5563">Distance</div></td>` : "",
      session.duration_min   ? `<td style="padding:0 20px 0 0"><div style="font-family:monospace;font-size:20px;font-weight:700;color:#E8ECF4">${session.duration_min}min</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#4B5563">Duration</div></td>` : "",
      session.pace_target    ? `<td style="padding:0 20px 0 0"><div style="font-family:monospace;font-size:20px;font-weight:700;color:#E8ECF4">${session.pace_target}</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#4B5563">Pace /km</div></td>` : "",
      session.heart_rate_zone ? `<td style="padding:0 20px 0 0"><div style="font-family:monospace;font-size:16px;font-weight:700;color:#E8ECF4">${session.heart_rate_zone}</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#4B5563">HR / RPE</div></td>` : "",
    ].filter(Boolean).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0F14;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#E8ECF4">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0F14;padding:40px 20px">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">

        <!-- Logo -->
        <tr><td style="padding-bottom:6px">
          <div style="font-size:36px;letter-spacing:4px;color:#F97316;font-weight:900">PACECOACH</div>
        </td></tr>
        <tr><td style="padding-bottom:32px">
          <div style="font-family:monospace;font-size:12px;color:#4B5563">// new session assigned</div>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding-bottom:16px">
          <p style="margin:0;font-size:15px">Hi ${athleteName},</p>
        </td></tr>
        <tr><td style="padding-bottom:28px">
          <p style="margin:0;font-size:14px;color:#9CA3AF;line-height:1.6">
            Your coach <strong style="color:#E8ECF4">${coachName}</strong> has assigned you a new training session:
          </p>
        </td></tr>

        <!-- Session card -->
        <tr><td style="padding-bottom:28px">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#161922;border:1px solid #2A2F40;border-left:4px solid #F97316;border-radius:8px;padding:20px">
            <tr><td style="padding-bottom:6px">
              <div style="font-family:monospace;font-size:12px;color:#6B7280">${longDate}</div>
            </td></tr>
            <tr><td style="padding-bottom:10px">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;background:rgba(249,115,22,.12);color:#F97316;padding:3px 10px;border-radius:20px;font-family:monospace">${typeLabel}</span>
            </td></tr>
            <tr><td style="padding-bottom:10px">
              <div style="font-size:18px;font-weight:700">${session.title}</div>
            </td></tr>
            ${session.description ? `<tr><td style="padding-bottom:14px"><div style="font-size:13px;color:#9CA3AF;line-height:1.6">${session.description}</div></td></tr>` : ""}
            ${statItems ? `<tr><td style="padding-bottom:${session.coach_notes ? "14" : "0"}px"><table><tr>${statItems}</tr></table></td></tr>` : ""}
            ${session.coach_notes ? `<tr><td><div style="background:#1E2230;border-radius:6px;padding:10px 14px;font-size:12px;color:#9CA3AF"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#F97316">Coach · </span>${session.coach_notes}</div></td></tr>` : ""}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td>
          <p style="margin:0;font-size:12px;color:#4B5563;line-height:1.6">
            Log in to PaceCoach to view your full schedule and record your session once complete.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      athleteEmail,
        subject: `New session: ${session.title} — ${shortDate}`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error (${res.status}): ${body}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("notify-athlete error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});