const REQUEST_HEADER = "New service request - Thermo Appliance Repair";

const COMMAND_HELP = [
  "Reply to a service request with one of:",
  "",
  "name — client name",
  "phone — phone number",
  "email — email",
  "address — street address",
  "city — city, state, ZIP",
  "appliance — appliance type",
  "brand — brand / model",
  "issue — problem description",
  "date — preferred date",
  "window — preferred time window",
  "hello — greeting message for the client",
  "help — show this list",
].join("\n");

function trim(str) {
  return typeof str === "string" ? str.trim() : "";
}

function formatServiceRequest(data) {
  const name = trim(data.name);
  const phone = trim(data.phone);
  const email = trim(data.email);
  const address = trim(data.address);
  const city = trim(data.city);
  const state = trim(data.state);
  const zip = trim(data.zip);
  const appliance = trim(data.appliance);
  const brandModel = trim(data.brand_model);
  const issue = trim(data.issue);
  const preferredDate = trim(data.preferred_date);
  const windowPref = trim(data.window);

  return [
    REQUEST_HEADER,
    "",
    "Name: " + name,
    "Phone: " + phone,
    "Email: " + (email || "-"),
    "",
    "Address: " + address,
    "City: " + city + ", " + state + " " + zip,
    "",
    "Appliance: " + appliance,
    "Brand / model: " + (brandModel || "-"),
    "",
    "Issue:",
    issue,
    "",
    "Preferred date: " + (preferredDate || "-"),
    "Preferred window: " + (windowPref || "Any"),
  ].join("\n");
}

function parseServiceRequest(text) {
  if (!text || text.indexOf(REQUEST_HEADER) === -1) {
    return null;
  }

  function lineValue(prefix) {
    const re = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*(.+)$", "m");
    const match = text.match(re);
    return match ? match[1].trim() : null;
  }

  const issueMatch = text.match(/\nIssue:\n([\s\S]*?)\n\nPreferred date:/);

  return {
    name: lineValue("Name:"),
    phone: lineValue("Phone:"),
    email: lineValue("Email:"),
    address: lineValue("Address:"),
    city: lineValue("City:"),
    appliance: lineValue("Appliance:"),
    brandModel: lineValue("Brand / model:"),
    issue: issueMatch ? issueMatch[1].trim() : null,
    preferredDate: lineValue("Preferred date:"),
    preferredWindow: lineValue("Preferred window:"),
  };
}

function normalizeCommand(raw) {
  if (!raw) return "";
  var cmd = trim(raw).toLowerCase();
  if (cmd.charAt(0) === "/") {
    cmd = cmd.slice(1);
    var space = cmd.indexOf(" ");
    if (space !== -1) {
      cmd = cmd.slice(0, space);
    }
  }
  return cmd.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function emptyValue(value) {
  return !value || value === "-";
}

function displayValue(value, fallback) {
  return emptyValue(value) ? fallback : value;
}

function formatWindowHours(value) {
  if (emptyValue(value) || value === "Any") {
    return null;
  }
  switch (String(value).trim().toLowerCase()) {
    case "morning":
      return "9am-12pm";
    case "afternoon":
      return "12pm-3pm";
    case "evening":
      return "3pm-6pm";
    default:
      return value;
  }
}

function buildHelloMessage(parsed) {
  var name = displayValue(parsed.name, "there");
  var appliance = displayValue(parsed.appliance, "appliance");
  var date = displayValue(parsed.preferredDate, "your preferred date");
  var windowPref = formatWindowHours(parsed.preferredWindow) || "your preferred window";

  return (
    "Hello, " +
    name +
    "! We received your request for a " +
    appliance +
    " diagnostic. The diagnostic fee is $80, and I can schedule you for " +
    date +
    " between " +
    windowPref +
    ". Please let me know if that time works for you. Thank you!"
  );
}

function getFieldFromRequest(parsed, command) {
  if (!parsed) return null;

  switch (command) {
    case "help":
    case "commands":
    case "start":
      return { type: "help" };
    case "name":
      return { type: "field", label: "Name", value: parsed.name };
    case "phone":
      return { type: "field", label: "Phone", value: parsed.phone };
    case "email":
      return { type: "field", label: "Email", value: parsed.email };
    case "address":
      return { type: "field", label: "Address", value: parsed.address };
    case "city":
      return { type: "field", label: "City", value: parsed.city };
    case "appliance":
      return { type: "field", label: "Appliance", value: parsed.appliance };
    case "brand":
    case "model":
    case "brand model":
      return { type: "field", label: "Brand / model", value: parsed.brandModel };
    case "issue":
    case "problem":
      return { type: "field", label: "Issue", value: parsed.issue };
    case "date":
    case "preferred date":
      return { type: "field", label: "Preferred date", value: parsed.preferredDate };
    case "window":
    case "time":
    case "preferred window":
      return {
        type: "field",
        label: "Preferred window",
        value: formatWindowHours(parsed.preferredWindow) || parsed.preferredWindow,
      };
    case "hello":
    case "greeting":
      return { type: "hello" };
    default:
      return { type: "unknown", command: command };
  }
}

function buildCommandReply(parsed, command) {
  var result = getFieldFromRequest(parsed, command);

  if (!result) {
    return "Could not read that service request.";
  }

  if (result.type === "help") {
    return COMMAND_HELP;
  }

  if (result.type === "hello") {
    return buildHelloMessage(parsed);
  }

  if (result.type === "unknown") {
    return (
      'Unknown command "' +
      (result.command || "") +
      '".\n\n' +
      COMMAND_HELP
    );
  }

  if (emptyValue(result.value)) {
    return result.label + " is not set in this request.";
  }

  return result.value;
}

module.exports = {
  REQUEST_HEADER,
  COMMAND_HELP,
  formatServiceRequest,
  parseServiceRequest,
  normalizeCommand,
  getFieldFromRequest,
  buildCommandReply,
  buildHelloMessage,
};
