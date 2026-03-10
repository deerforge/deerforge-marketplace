import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Lead magnet configuration ──────────────────────────────────
const LEAD_MAGNET = {
  title: "DeerFlow Error Decoder",
  description: "Debug DeerFlow 2.0 deployment issues with confidence using our comprehensive troubleshooting guide.",
  pdfUrl: "https://raw.githubusercontent.com/deerforge/deerforge-marketplace/main/resources/error-decoder/deerflow-error-decoder-v1.0.pdf",
  markdownUrl: "https://raw.githubusercontent.com/deerforge/deerforge-marketplace/main/resources/error-decoder/deerflow-error-decoder-v1.0.md",
};

// Cached audience ID — looked up once, reused across invocations
let cachedAudienceId = null;

// ── Email validation ───────────────────────────────────────────
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ── Rate limit helper ──────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Get audience ID (cached after first call) ──────────────────
async function getAudienceId() {
  if (cachedAudienceId) return cachedAudienceId;

  const audiences = await resend.audiences.list();
  if (audiences.error) {
    throw new Error(`Failed to list audiences: ${audiences.error.message}`);
  }

  const audience = audiences.data?.data?.find(a => a.name === "DeerForge Leads");
  if (!audience) {
    await delay(600);
    const newAudience = await resend.audiences.create({ name: "DeerForge Leads" });
    if (newAudience.error) {
      throw new Error(`Failed to create audience: ${newAudience.error.message}`);
    }
    cachedAudienceId = newAudience.data.id;
  } else {
    cachedAudienceId = audience.id;
  }

  return cachedAudienceId;
}

// ── Welcome email template ─────────────────────────────────────
function buildWelcomeEmail(email) {
  const firstName = email.split("@")[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your DeerFlow Error Decoder is ready</title>
</head>
<body style="margin:0;padding:0;background-color:#0D1117;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#161B22;border-radius:12px 12px 0 0;padding:32px 40px;border-bottom:2px solid #D97757;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#D97757;letter-spacing:-0.5px;">DEERFORGE</span>
                    <span style="font-size:11px;color:#6B7280;margin-left:10px;font-weight:400;letter-spacing:1px;text-transform:uppercase;">Where AI builders ship.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background-color:#161B22;padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:32px;">🔧</p>
              <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#F9FAFB;line-height:1.3;">
                Your ${LEAD_MAGNET.title} is ready, ${firstName}.
              </h1>
              <p style="margin:0;font-size:15px;color:#9CA3AF;line-height:1.6;">
                Thanks for joining the DeerForge community. ${LEAD_MAGNET.description}
              </p>
            </td>
          </tr>

          <!-- Download Links -->
          <tr>
            <td style="background-color:#161B22;padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#D97757;border-radius:8px;margin-bottom:12px;">
                    <a href="${LEAD_MAGNET.pdfUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0D1117;text-decoration:none;letter-spacing:-0.2px;width:100%;box-sizing:border-box;text-align:center;">
                      📄 Download PDF Version →
                    </a>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#21262D;border-radius:8px;border:1px solid #30363D;">
                    <a href="${LEAD_MAGNET.markdownUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#D97757;text-decoration:none;letter-spacing:-0.2px;width:100%;box-sizing:border-box;text-align:center;">
                      📝 Download Markdown Version →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:16px 0 0;font-size:13px;color:#6B7280;line-height:1.5;">
                <strong>Two formats for maximum utility:</strong><br/>
                The PDF is formatted for you. The Markdown version is formatted for your agents and AI tools.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background-color:#161B22;padding:0 40px;">
              <hr style="border:none;border-top:1px solid #21262D;margin:0;" />
            </td>
          </tr>

          <!-- What's next -->
          <tr>
            <td style="background-color:#161B22;padding:32px 40px;">
              <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#6B7280;letter-spacing:1px;text-transform:uppercase;">
                What's next
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px;background-color:#0D1117;border-radius:8px;border-left:3px solid #D97757;">
                    <p style="margin:0 0 12px;font-size:14px;color:#F9FAFB;font-weight:600;">
                      Ready to go beyond debugging?
                    </p>
                    <p style="margin:0;font-size:14px;color:#9CA3AF;line-height:1.6;">
                      Once you've got DeerFlow running smoothly, check out our premium guides: 
                      <strong style="color:#D97757;">DeerFlow Docker Masterclass</strong> and 
                      <strong style="color:#D97757;">Ollama Integration Guide</strong>. 
                      They'll take you from setup to production deployment.
                    </p>
                    <p style="margin:12px 0 0;">
                      <a href="https://deerforge.io" style="color:#D97757;text-decoration:none;font-weight:600;">
                        Browse the marketplace →
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Personal note -->
          <tr>
            <td style="background-color:#161B22;padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px;background-color:#0D1117;border-radius:8px;border-left:3px solid #4B5563;">
                    <p style="margin:0;font-size:14px;color:#9CA3AF;line-height:1.6;">
                      Questions about the guide? Building something interesting with DeerFlow? 
                      Reply to this email and you'll reach me directly.
                    </p>
                    <p style="margin:8px 0 0;font-size:13px;color:#6B7280;">
                      — Io, AI CEO · DeerForge
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0D1117;border-radius:0 0 12px 12px;padding:24px 40px;border-top:1px solid #21262D;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#4B5563;line-height:1.6;">
                      You received this because you downloaded the ${LEAD_MAGNET.title} at 
                      <a href="https://deerforge.io" style="color:#D97757;text-decoration:none;">deerforge.io</a>.
                      <br/>DeerForge · <a href="https://deerforge.io" style="color:#D97757;text-decoration:none;">deerforge.io</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Subscribe handler ──────────────────────────────────────────
export default async function handler(req, res) {
  // CORS headers for frontend integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let email;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    email = body.email?.trim().toLowerCase();
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  if (!email) {
    return res.status(400).json({ error: "Email address is required" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email address format" });
  }

  try {
    // ── Step 1: Send the welcome email FIRST (highest priority) ──
    const emailResult = await resend.emails.send({
      from: "Io at DeerForge <io@deerforge.io>",
      to: email,
      subject: `Your ${LEAD_MAGNET.title} is ready`,
      html: buildWelcomeEmail(email),
    });
    console.log("Email send response:", JSON.stringify(emailResult));

    if (emailResult.error) {
      throw new Error(`Resend email error: ${emailResult.error.message}`);
    }

    // ── Step 2: Wait 600ms to respect 2 req/sec rate limit ──
    await delay(600);

    // ── Step 3: Add contact to audience (non-critical — don't fail the request) ──
    try {
      const audienceId = await getAudienceId();
      await delay(600);

      const contactResult = await resend.contacts.create({
        email: email,
        audienceId: audienceId,
      });
      console.log("Contact added:", JSON.stringify(contactResult));
    } catch (contactErr) {
      // Log but don't fail — the email was already sent successfully
      console.warn("Contact add failed (non-critical):", contactErr.message);
    }

    console.log(`Lead captured and welcome email sent to: ${email}`);

    return res.status(200).json({
      success: true,
      message: "Welcome email sent! Check your inbox for download links."
    });

  } catch (err) {
    console.error("Subscription failed:", err.message);

    if (err.message?.includes('already exists')) {
      return res.status(409).json({
        error: "Email already subscribed",
        message: "You're already on our list! Check your email for the download links."
      });
    }

    return res.status(500).json({
      error: "Failed to process subscription",
      message: "Something went wrong. Please try again."
    });
  }
}
