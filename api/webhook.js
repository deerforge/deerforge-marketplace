import Stripe from "stripe";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Read raw body from request stream (required for Stripe signature verification)
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ── Product catalog ────────────────────────────────────────────
// Map Stripe product names to delivery details.
const PRODUCTS = {
  "DeerFlow Docker Masterclass": {
    downloadUrl: "https://deerforge.io/products/docker-masterclass/DeerFlow-Docker-Masterclass-v2.0.pdf",
    mdUrl: "https://deerforge.io/products/docker-masterclass/DeerFlow-Docker-Masterclass-v2.0.md",
    subject: "Your DeerFlow Docker Masterclass is ready",
    title: "DeerFlow Docker Masterclass",
    description: "Deploy AI workflows with Docker in under 30 minutes.",
    emoji: "🐋",
  },
  "Ollama Integration Guide": {
    downloadUrl: "https://deerforge.io/products/ollama-complete-guide.pdf",
    subject: "Your Ollama Integration Guide is ready",
    title: "Ollama Integration Guide",
    description: "Run local AI models and integrate them into your DeerFlow workflows.",
    emoji: "🦙",
  },
};

// ── Email template ─────────────────────────────────────────────
function buildEmail({ customerName, product }) {
  const firstName = customerName?.split(" ")[0] || "builder";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${product.subject}</title>
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
              <p style="margin:0 0 8px;font-size:32px;">${product.emoji}</p>
              <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#F9FAFB;line-height:1.3;">
                Your download is ready, ${firstName}.
              </h1>
              <p style="margin:0;font-size:15px;color:#9CA3AF;line-height:1.6;">
                Thanks for purchasing <strong style="color:#D97757;">${product.title}</strong>. 
                ${product.description}
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background-color:#161B22;padding:0 40px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#D97757;border-radius:8px;">
                    <a href="${product.downloadUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0D1117;text-decoration:none;letter-spacing:-0.2px;">
                      Download Your Guide →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;color:#6B7280;">
                Link not working? Copy and paste this URL into your browser:<br/>
                <a href="${product.downloadUrl}" style="color:#D97757;word-break:break-all;">${product.downloadUrl}</a>
              </p>
              ${product.mdUrl ? `
              <p style="margin:16px 0 0;font-size:12px;color:#6B7280;">
                You also get the Markdown version — formatted for AI agents, RAG pipelines, and coding assistants:<br/>
                <a href="${product.mdUrl}" style="color:#D97757;word-break:break-all;">${product.mdUrl}</a>
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background-color:#161B22;padding:0 40px;">
              <hr style="border:none;border-top:1px solid #21262D;margin:0;" />
            </td>
          </tr>

          <!-- What's inside -->
          <tr>
            <td style="background-color:#161B22;padding:32px 40px;">
              <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#6B7280;letter-spacing:1px;text-transform:uppercase;">
                What's next
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 16px;background-color:#0D1117;border-radius:8px;border-left:3px solid #D97757;">
                    <p style="margin:0;font-size:14px;color:#9CA3AF;line-height:1.6;">
                      Questions? Reply to this email and you'll reach me directly.<br/>
                      Building something with DeerFlow? I'd love to hear about it.
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
                      You received this because you purchased ${product.title} at 
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

// ── Webhook handler ────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify Stripe signature using raw body
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Only handle successful payments
  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;

  if (!customerEmail) {
    console.error("No customer email found in session");
    return res.status(400).json({ error: "No customer email" });
  }

  // Get line items to identify what was purchased
  let lineItems;
  try {
    lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  } catch (err) {
    console.error("Failed to fetch line items:", err.message);
    return res.status(500).json({ error: "Failed to fetch line items" });
  }

  // Send fulfillment email for each purchased product
  const emailPromises = lineItems.data.map(async (item) => {
    const productName = item.description;
    const product = PRODUCTS[productName];

    if (!product) {
      console.warn(`No product config found for: ${productName}`);
      return;
    }

    try {
      await resend.emails.send({
        from: "Io at DeerForge <io@deerforge.io>",
        to: customerEmail,
        subject: product.subject,
        html: buildEmail({ customerName, product }),
      });
      console.log(`Fulfillment email sent to ${customerEmail} for ${productName}`);
    } catch (err) {
      console.error(`Failed to send email for ${productName}:`, err.message);
      throw err;
    }
  });

  try {
    await Promise.all(emailPromises);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Fulfillment failed:", err.message);
    return res.status(500).json({ error: "Fulfillment failed" });
  }
}

// Required for Stripe signature verification — disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};
