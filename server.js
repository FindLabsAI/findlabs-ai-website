require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const validator = require("validator");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const REQUESTS_FILE = path.join(DATA_DIR, "employee-requests.json");
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);
app.use(express.json({ limit: "96kb" }));
app.use(express.urlencoded({ extended: false, limit: "96kb" }));
app.use(express.static(PUBLIC_DIR));

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please wait and try again." }
});

const allowed = {
  problems: [
    "Follow up with leads and customers",
    "Handle customer support",
    "Process documents",
    "Review contracts",
    "Assist HR and recruiting",
    "Analyze reports",
    "Automate internal operations",
    "Research products, vendors, or competitors",
    "Other"
  ],
  departments: [
    "Sales",
    "Customer Support",
    "HR",
    "Finance",
    "Legal",
    "Operations",
    "Healthcare Administration",
    "IT",
    "Executive Office",
    "Other"
  ],
  systems: [
    "Microsoft Outlook",
    "Gmail",
    "Microsoft Teams",
    "Slack",
    "Salesforce",
    "HubSpot",
    "Jira",
    "Notion",
    "SharePoint",
    "Google Drive",
    "Microsoft OneDrive",
    "SAP",
    "Oracle",
    "SQL Database",
    "Internal APIs",
    "Custom Application",
    "Other"
  ],
  knowledgeSources: [
    "Policies",
    "SOPs",
    "Product manuals",
    "Customer records",
    "CRM records",
    "Emails",
    "Contracts",
    "Internal documents",
    "Knowledge bases",
    "Databases",
    "Company terminology",
    "Existing templates"
  ],
  actions: [
    "Read information",
    "Draft content",
    "Send emails",
    "Update CRM",
    "Create tickets",
    "Create calendar events",
    "Generate reports",
    "Notify managers",
    "Call internal APIs",
    "Modify records",
    "Require approval before every action",
    "Require approval only for sensitive actions"
  ],
  deployments: [
    "Cloud deployment",
    "Hybrid deployment",
    "Private deployment",
    "Client-managed infrastructure",
    "Not sure, recommend an option"
  ],
  securityRequirements: [
    "Role-based access",
    "Audit logging",
    "Encryption",
    "Human approval",
    "Data retention requirements",
    "Compliance requirements",
    "Sensitive data restrictions",
    "No cross-company knowledge sharing",
    "Other"
  ],
  budgets: ["Under $5,000", "$5,000-$15,000", "$15,000-$50,000", "$50,000+", "Not sure"],
  urgency: ["Exploratory", "Planned", "Urgent"]
};

function cleanText(value, max = 400) {
  if (typeof value !== "string") return "";
  return validator.escape(validator.trim(value)).slice(0, max);
}

function normalizeArray(value, options, max = 20) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item, 120)).filter((item) => options.includes(item)))].slice(0, max);
}

function isConfiguredSmtp() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function emailList(value, fallback) {
  const raw = value || fallback || "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => validator.isEmail(item));
}

function normalizeRequest(body) {
  return {
    companyName: cleanText(body.companyName, 160),
    website: cleanText(body.website, 220),
    industry: cleanText(body.industry, 120),
    companySize: cleanText(body.companySize, 80),
    country: cleanText(body.country, 80),
    contactName: cleanText(body.contactName, 120),
    contactEmail: validator.normalizeEmail(String(body.contactEmail || "")) || "",
    phone: cleanText(body.phone, 50),
    businessProblem: cleanText(body.businessProblem, 160),
    businessProblemOther: cleanText(body.businessProblemOther, 220),
    workflowDescription: cleanText(body.workflowDescription, 2500),
    department: cleanText(body.department, 80),
    departmentOther: cleanText(body.departmentOther, 160),
    systems: normalizeArray(body.systems, allowed.systems),
    systemsOther: cleanText(body.systemsOther, 220),
    knowledgeSources: normalizeArray(body.knowledgeSources, allowed.knowledgeSources),
    actions: normalizeArray(body.actions, allowed.actions),
    deploymentPreference: cleanText(body.deploymentPreference, 120),
    securityRequirements: normalizeArray(body.securityRequirements, allowed.securityRequirements),
    securityRequirementsOther: cleanText(body.securityRequirementsOther, 300),
    securityNotes: cleanText(body.securityNotes, 1000),
    timeline: cleanText(body.timeline, 120),
    budget: cleanText(body.budget, 80),
    urgency: cleanText(body.urgency, 80),
    expectedUsers: cleanText(body.expectedUsers, 40)
  };
}

function validateRequest(data) {
  const errors = {};
  const requiredText = [
    "companyName",
    "industry",
    "companySize",
    "contactName",
    "contactEmail",
    "department",
    "businessProblem",
    "timeline",
    "budget"
  ];

  for (const field of requiredText) {
    if (!data[field]) errors[field] = "This field is required.";
  }

  if (data.contactEmail && !validator.isEmail(data.contactEmail)) {
    errors.contactEmail = "Enter a valid work email.";
  }
  if (data.website && !validator.isURL(data.website, { require_protocol: false })) {
    errors.website = "Enter a valid website.";
  }
  if (!allowed.departments.includes(data.department)) errors.department = "Choose a listed department.";
  if (!allowed.problems.includes(data.businessProblem)) errors.businessProblem = "Choose a listed problem.";
  if (!allowed.budgets.includes(data.budget)) errors.budget = "Choose a listed budget.";
  if (data.deploymentPreference && !allowed.deployments.includes(data.deploymentPreference)) {
    errors.deploymentPreference = "Choose a listed deployment preference.";
  }
  if (data.urgency && !allowed.urgency.includes(data.urgency)) errors.urgency = "Choose a listed urgency.";

  for (const field of ["systems", "knowledgeSources", "actions", "securityRequirements"]) {
    if (!data[field].length) errors[field] = "Choose at least one option.";
  }

  const otherDetails = {
    businessProblem: "businessProblemOther",
    department: "departmentOther",
    systems: "systemsOther",
    securityRequirements: "securityRequirementsOther"
  };
  for (const [field, detailField] of Object.entries(otherDetails)) {
    const value = data[field];
    const selectedOther = Array.isArray(value) ? value.includes("Other") : value === "Other";
    if (selectedOther && !data[detailField]) {
      errors[detailField] = "Describe the Other option.";
    }
  }

  return errors;
}

async function readRequests() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(REQUESTS_FILE, "utf8");
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
    if (Array.isArray(parsed)) return parsed;
    return parsed && typeof parsed === "object" ? [parsed] : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(REQUESTS_FILE, "[]\n", "utf8");
      return [];
    }
    throw error;
  }
}

let writeQueue = Promise.resolve();
function appendRequest(record) {
  writeQueue = writeQueue.then(async () => {
    const requests = await readRequests();
    requests.push(record);
    const tempFile = `${REQUESTS_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, `${JSON.stringify(requests, null, 2)}\n`, "utf8");
    await fs.rename(tempFile, REQUESTS_FILE);
  });
  return writeQueue;
}

function formatBlueprint(record) {
  const r = record.request;
  const showOther = (value, detail) => {
    if (Array.isArray(value)) {
      return value.map((item) => (item === "Other" && detail ? `Other: ${detail}` : item)).join(", ");
    }
    return value === "Other" && detail ? `Other: ${detail}` : value;
  };
  return [
    `Request ID: ${record.id}`,
    `Submitted: ${record.submittedAt}`,
    "",
    "Company",
    `- Company: ${r.companyName}`,
    `- Website: ${r.website || "Not provided"}`,
    `- Industry: ${r.industry}`,
    `- Size: ${r.companySize}`,
    `- Country: ${r.country || "Not provided"}`,
    `- Contact: ${r.contactName} <${r.contactEmail}>`,
    `- Phone: ${r.phone || "Not provided"}`,
    "",
    "AI Employee Blueprint",
    `- Department: ${showOther(r.department, r.departmentOther)}`,
    `- Primary responsibility: ${showOther(r.businessProblem, r.businessProblemOther)}`,
    `- Workflow: ${r.workflowDescription || "Not provided"}`,
    `- Systems to connect: ${showOther(r.systems, r.systemsOther)}`,
    `- Knowledge sources: ${r.knowledgeSources.join(", ")}`,
    `- Actions: ${r.actions.join(", ")}`,
    `- Approval requirements: ${r.actions.filter((item) => item.includes("approval")).join(", ") || "Not specified"}`,
    `- Deployment preference: ${r.deploymentPreference || "Not specified"}`,
    `- Security preferences: ${showOther(r.securityRequirements, r.securityRequirementsOther)}`,
    `- Security notes: ${r.securityNotes || "Not provided"}`,
    `- Timeline: ${r.timeline}`,
    `- Budget: ${r.budget}`,
    `- Priority: ${r.urgency || "Not specified"}`,
    `- Expected users: ${r.expectedUsers || "Not provided"}`
  ].join("\n");
}

function formatLeadHtml(record) {
  const r = record.request;
  const showOther = (value, detail) => {
    if (Array.isArray(value)) {
      return value.map((item) => (item === "Other" && detail ? `Other: ${detail}` : item)).join(", ");
    }
    return value === "Other" && detail ? `Other: ${detail}` : value;
  };
  const row = (label, value) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e7eaf0;color:#5f6675;width:180px;">${label}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e7eaf0;color:#0f172a;font-weight:600;">${value || "Not provided"}</td>
    </tr>`;

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:760px;margin:0 auto;padding:28px;">
        <div style="background:#ffffff;border:1px solid #e7eaf0;border-radius:12px;overflow:hidden;">
          <div style="padding:24px 28px;background:#07111f;color:#ffffff;">
            <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8fbfff;">New AI Employee Request</div>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;">${r.companyName}</h1>
            <p style="margin:10px 0 0;color:#cbd5e1;">Request ID: ${record.id}<br>Submitted: ${record.submittedAt}</p>
          </div>
          <div style="padding:24px 28px;">
            <h2 style="font-size:18px;margin:0 0 12px;">Contact Details</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              ${row("Contact name", r.contactName)}
              ${row("Email", `<a href="mailto:${r.contactEmail}" style="color:#2f8cff;">${r.contactEmail}</a>`)}
              ${row("Phone", r.phone)}
              ${row("Website", r.website)}
              ${row("Country", r.country)}
            </table>

            <h2 style="font-size:18px;margin:0 0 12px;">Company</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              ${row("Industry", r.industry)}
              ${row("Company size", r.companySize)}
              ${row("Department", showOther(r.department, r.departmentOther))}
              ${row("Timeline", r.timeline)}
              ${row("Budget", r.budget)}
              ${row("Priority", r.urgency)}
              ${row("Expected users", r.expectedUsers)}
            </table>

            <h2 style="font-size:18px;margin:0 0 12px;">AI Employee Blueprint</h2>
            <table style="width:100%;border-collapse:collapse;">
              ${row("Primary responsibility", showOther(r.businessProblem, r.businessProblemOther))}
              ${row("Workflow", r.workflowDescription)}
              ${row("Systems to connect", showOther(r.systems, r.systemsOther))}
              ${row("Knowledge sources", r.knowledgeSources.join(", "))}
              ${row("Actions", r.actions.join(", "))}
              ${row("Deployment", r.deploymentPreference)}
              ${row("Security", showOther(r.securityRequirements, r.securityRequirementsOther))}
              ${row("Security notes", r.securityNotes)}
            </table>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

async function sendEmails(record) {
  if (!isConfiguredSmtp()) {
    console.warn("SMTP is not configured. Request saved; email notifications are pending.");
    return { configured: false, sent: false };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const notificationEmails = emailList(process.env.NOTIFICATION_EMAIL, "founder@findlabs.org");
  if (!notificationEmails.length) {
    console.warn("No valid NOTIFICATION_EMAIL configured. Request saved; admin email was not sent.");
    return { configured: true, sent: false };
  }
  const blueprint = formatBlueprint(record);
  const fromName = process.env.SMTP_FROM_NAME || "FindLabs AI";
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const from = `${fromName} <${fromAddress}>`;

  await transporter.sendMail({
    from,
    to: notificationEmails,
    replyTo: `${record.request.contactName} <${record.request.contactEmail}>`,
    subject: `New AI Employee Request: ${record.request.companyName}`,
    text: blueprint,
    html: formatLeadHtml(record)
  });

  await transporter.sendMail({
    from,
    to: record.request.contactEmail,
    replyTo: notificationEmails[0],
    subject: "Your FindLabs AI Employee Request Has Been Received",
    text: [
      "Your AI Employee Request Has Been Received.",
      "",
      "Our AI Solutions Team will review your business workflow and contact you within 48 business hours.",
      "",
      "You will receive:",
      "- Recommended solution architecture",
      "- Integration approach",
      "- Estimated implementation timeline",
      "- Initial cost estimate",
      "- Next-step consultation",
      "",
      blueprint
    ].join("\n")
  });

  return { configured: true, sent: true };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/employee-requests", submissionLimiter, async (req, res) => {
  try {
    const normalized = normalizeRequest(req.body || {});
    const errors = validateRequest(normalized);
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: "Please review the highlighted fields.", errors });
    }

    const record = {
      id: `FL-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      submittedAt: new Date().toISOString(),
      request: normalized
    };

    await appendRequest(record);

    let email = { configured: false, sent: false };
    try {
      email = await sendEmails(record);
    } catch (error) {
      console.warn(`Email notification failed for ${record.id}: ${error.message}`);
      email = { configured: true, sent: false };
    }

    res.status(201).json({
      ok: true,
      requestId: record.id,
      submittedAt: record.submittedAt,
      emailNotification: email.sent ? "sent" : "pending",
      request: normalized
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "The request could not be saved. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`FindLabs AI Employee running at http://localhost:${PORT}`);
});
