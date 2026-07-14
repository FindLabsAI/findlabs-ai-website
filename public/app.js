const options = {
  businessProblem: [
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
  department: ["Sales", "Customer Support", "HR", "Finance", "Legal", "Operations", "Healthcare Administration", "IT", "Executive Office", "Other"],
  systems: ["Microsoft Outlook", "Gmail", "Microsoft Teams", "Slack", "Salesforce", "HubSpot", "Jira", "Notion", "SharePoint", "Google Drive", "Microsoft OneDrive", "SAP", "Oracle", "SQL Database", "Internal APIs", "Custom Application", "Other"],
  knowledgeSources: ["Policies", "SOPs", "Product manuals", "Customer records", "CRM records", "Emails", "Contracts", "Internal documents", "Knowledge bases", "Databases", "Company terminology", "Existing templates"],
  actions: ["Read information", "Draft content", "Send emails", "Update CRM", "Create tickets", "Create calendar events", "Generate reports", "Notify managers", "Call internal APIs", "Modify records", "Require approval before every action", "Require approval only for sensitive actions"],
  securityRequirements: ["Role-based access", "Audit logging", "Encryption", "Human approval", "Data retention requirements", "Compliance requirements", "Sensitive data restrictions", "No cross-company knowledge sharing", "Other"]
};

const otherFields = {
  businessProblem: {
    key: "businessProblemOther",
    label: "What problem should your AI employee solve?",
    placeholder: "Describe the other business problem"
  },
  department: {
    key: "departmentOther",
    label: "Which department should this support?",
    placeholder: "Enter the department"
  },
  systems: {
    key: "systemsOther",
    label: "Which other system or integration?",
    placeholder: "Name the other system"
  },
  securityRequirements: {
    key: "securityRequirementsOther",
    label: "What other security requirement?",
    placeholder: "Describe the requirement"
  }
};

const storageKey = "findlabsAiEmployeeDraft";
const form = document.querySelector("#employeeForm");
const wizardShell = document.querySelector("#wizardShell");
const steps = [...document.querySelectorAll(".step")];
const formError = document.querySelector("#formError");
const nextButton = document.querySelector("#nextStep");
const prevButton = document.querySelector("#prevStep");
const submitButton = document.querySelector("#submitRequest");
const editButton = document.querySelector("#editStep");
let currentStep = 0;
let isSubmitting = false;

const state = {
  companyName: "",
  website: "",
  industry: "",
  companySize: "",
  country: "",
  contactName: "",
  contactEmail: "",
  phone: "",
  businessProblem: "",
  businessProblemOther: "",
  workflowDescription: "",
  department: "",
  departmentOther: "",
  systems: [],
  systemsOther: "",
  knowledgeSources: [],
  actions: [],
  deploymentPreference: "",
  securityRequirements: [],
  securityRequirementsOther: "",
  securityNotes: "",
  timeline: "",
  budget: "",
  urgency: "",
  expectedUsers: ""
};

function renderChoices() {
  document.querySelectorAll(".choice-grid").forEach((grid) => {
    const field = grid.dataset.field;
    const isMulti = grid.classList.contains("multi");
    options[field].forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-card";
      button.textContent = label;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        if (isMulti) {
          const selected = new Set(state[field]);
          selected.has(label) ? selected.delete(label) : selected.add(label);
          state[field] = [...selected];
        } else {
          state[field] = label;
        }
        updateChoices();
        saveDraft();
      });
      grid.appendChild(button);
    });
    if (otherFields[field]) {
      const other = document.createElement("label");
      other.className = "other-detail";
      other.hidden = true;
      const span = document.createElement("span");
      span.textContent = otherFields[field].label;
      const input = document.createElement("input");
      input.name = otherFields[field].key;
      input.placeholder = otherFields[field].placeholder;
      input.autocomplete = "off";
      input.addEventListener("input", saveDraft);
      other.append(span, input);
      grid.insertAdjacentElement("afterend", other);
    }
  });
}

function updateChoices() {
  document.querySelectorAll(".choice-grid").forEach((grid) => {
    const field = grid.dataset.field;
    grid.querySelectorAll(".choice-card").forEach((button) => {
      const selected = Array.isArray(state[field]) ? state[field].includes(button.textContent) : state[field] === button.textContent;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  });
  updateOtherDetails();
}

function updateOtherDetails() {
  Object.entries(otherFields).forEach(([field, config]) => {
    const grid = document.querySelector(`.choice-grid[data-field="${field}"]`);
    if (!grid) return;
    const detail = grid.nextElementSibling?.classList.contains("other-detail") ? grid.nextElementSibling : null;
    if (!detail) return;
    const selected = Array.isArray(state[field]) ? state[field].includes("Other") : state[field] === "Other";
    detail.hidden = !selected;
    const input = detail.querySelector("input");
    if (input) {
      input.required = selected;
      input.disabled = !selected;
      if (!selected) {
        state[config.key] = "";
        input.value = "";
      }
    }
  });
}

function syncInputsToState() {
  new FormData(form).forEach((value, key) => {
    if (!Array.isArray(state[key])) state[key] = String(value).trim();
  });
}

function syncStateToInputs() {
  Object.entries(state).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field && !Array.isArray(value)) field.value = value;
  });
  updateChoices();
}

function saveDraft() {
  syncInputsToState();
  localStorage.setItem(storageKey, JSON.stringify({ ...state, currentStep }));
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(storageKey) || "{}");
    Object.keys(state).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(draft, key)) state[key] = draft[key];
    });
    currentStep = Number.isInteger(draft.currentStep) && draft.currentStep >= 0 && draft.currentStep < 9 ? draft.currentStep : 0;
    syncStateToInputs();
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function showWizard() {
  wizardShell.classList.add("open");
  wizardShell.setAttribute("aria-hidden", "false");
  renderStep();
  setTimeout(() => {
    const firstInput = steps[currentStep].querySelector("input, select, textarea, button");
    if (firstInput) firstInput.focus();
  }, 0);
}

function closeWizard() {
  wizardShell.classList.remove("open");
  wizardShell.setAttribute("aria-hidden", "true");
}

function setError(message) {
  formError.textContent = message || "";
}

function validateStep(index) {
  syncInputsToState();
  const requiredByStep = {
    0: ["companyName", "industry", "companySize", "contactName", "contactEmail"],
    1: ["businessProblem"],
    2: ["department"],
    3: ["systems"],
    4: ["knowledgeSources"],
    5: ["actions"],
    6: ["deploymentPreference", "securityRequirements"],
    7: ["timeline", "budget"]
  };
  const required = requiredByStep[index] || [];
  for (const key of required) {
    const value = state[key];
    if (Array.isArray(value) ? value.length === 0 : !value) {
      return "Please complete the required fields before continuing.";
    }
  }
  const otherByStep = {
    1: "businessProblem",
    2: "department",
    3: "systems",
    6: "securityRequirements"
  };
  const otherField = otherByStep[index];
  if (otherField) {
    const selected = Array.isArray(state[otherField]) ? state[otherField].includes("Other") : state[otherField] === "Other";
    const detailKey = otherFields[otherField].key;
    if (selected && !state[detailKey]) {
      return "Please describe the option you selected as Other.";
    }
  }
  if (index === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contactEmail)) {
    return "Please enter a valid work email.";
  }
  if (index === 0 && state.website) {
    try {
      new URL(state.website.startsWith("http") ? state.website : `https://${state.website}`);
    } catch {
      return "Please enter a valid website.";
    }
  }
  return "";
}

function renderStep() {
  steps.forEach((step, index) => step.classList.toggle("active", index === currentStep));
  const percent = Math.round(((currentStep + 1) / steps.length) * 100);
  document.querySelector("#stepLabel").textContent = `Step ${currentStep + 1} of ${steps.length}`;
  document.querySelector("#progressPercent").textContent = `${percent}%`;
  document.querySelector("#progressFill").style.width = `${percent}%`;
  prevButton.style.display = currentStep > 0 && currentStep < 9 ? "inline-flex" : "none";
  nextButton.style.display = currentStep < 8 ? "inline-flex" : "none";
  submitButton.style.display = currentStep === 8 ? "inline-flex" : "none";
  editButton.style.display = currentStep === 8 ? "inline-flex" : "none";
  if (currentStep === 8) renderBlueprint();
  if (currentStep === 9) {
    nextButton.style.display = "none";
    prevButton.style.display = "none";
    submitButton.style.display = "none";
    editButton.style.display = "none";
  }
  setError("");
  saveDraft();
}

function joinValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not selected";
  return value || "Not provided";
}

function withOther(value, detail) {
  if (Array.isArray(value)) {
    return value.map((item) => (item === "Other" && detail ? `Other: ${detail}` : item));
  }
  return value === "Other" && detail ? `Other: ${detail}` : value;
}

function renderBlueprint() {
  syncInputsToState();
  const blueprint = document.querySelector("#blueprint");
  blueprint.textContent = "";
  const rows = [
    ["Company", state.companyName, 0],
    ["Department", withOther(state.department, state.departmentOther), 2],
    ["Primary responsibility", withOther(state.businessProblem, state.businessProblemOther), 1],
    ["Business problem", state.workflowDescription, 1],
    ["Systems to connect", withOther(state.systems, state.systemsOther), 3],
    ["Knowledge sources", state.knowledgeSources, 4],
    ["Actions", state.actions, 5],
    ["Approval requirements", state.actions.filter((item) => item.includes("approval")), 5],
    ["Security preferences", [...withOther(state.securityRequirements, state.securityRequirementsOther), state.deploymentPreference].filter(Boolean), 6],
    ["Timeline", state.timeline, 7],
    ["Budget", state.budget, 7]
  ];
  rows.forEach(([label, value, stepIndex]) => {
    const item = document.createElement("div");
    item.className = "blueprint-item";
    const title = document.createElement("span");
    title.textContent = label;
    const content = document.createElement("strong");
    content.textContent = joinValue(value);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      currentStep = stepIndex;
      renderStep();
    });
    item.append(title, content, edit);
    blueprint.appendChild(item);
  });
}

function collectPayload() {
  syncInputsToState();
  return { ...state };
}

async function submitRequest() {
  if (isSubmitting) return;
  const validationMessage = validateStep(7);
  if (validationMessage) {
    currentStep = 7;
    renderStep();
    setError(validationMessage);
    return;
  }
  isSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";
  setError("");
  try {
    const response = await fetch("/api/employee-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectPayload())
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Submission failed.");
    document.querySelector("#confirmationNumber").textContent = result.requestId;
    document.querySelector("#emailStatus").textContent =
      result.emailNotification === "sent"
        ? "Confirmation email sent."
        : "Your request was saved successfully. Email notification is pending until SMTP is configured.";
    localStorage.removeItem(storageKey);
    currentStep = 9;
    renderStep();
  } catch (error) {
    setError(error.message || "Something went wrong. Please try again.");
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "Submit Request";
  }
}

document.querySelectorAll("[data-open-wizard]").forEach((button) => button.addEventListener("click", showWizard));
document.querySelectorAll("[data-close-wizard]").forEach((button) => button.addEventListener("click", closeWizard));
document.querySelector(".nav-toggle").addEventListener("click", (event) => {
  const links = document.querySelector("#navLinks");
  const isOpen = links.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
});
form.addEventListener("input", saveDraft);
nextButton.addEventListener("click", () => {
  const message = validateStep(currentStep);
  if (message) {
    setError(message);
    return;
  }
  currentStep += 1;
  renderStep();
});
prevButton.addEventListener("click", () => {
  currentStep = Math.max(0, currentStep - 1);
  renderStep();
});
editButton.addEventListener("click", () => {
  currentStep = 0;
  renderStep();
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitRequest();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && wizardShell.classList.contains("open")) closeWizard();
});

renderChoices();
restoreDraft();
renderStep();
