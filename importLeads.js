const mongoose = require("mongoose");
const csv = require("csvtojson");
const fs = require("fs");
const Lead = require("./models/lead");
require("dotenv").config();

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function importLeads() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const leads = await csv().fromFile("./leads.csv");

    if (!leads.length) {
      console.log("CSV file is empty");
      process.exit();
    }

    let errorRows = [];
    let emailSet = new Set();

    // Step 1: Basic Cleaning + Validation
    const cleanLeads = leads.map((l, index) => {
      const name = l.name?.trim();
      const email = l.email?.trim().toLowerCase();
      const phone = l.phone?.trim();

      // Email required check
      if (!email) {
        errorRows.push({ ...l, error: "Email is required" });
        return null;
      }

      // Email format check
      if (!validateEmail(email)) {
        errorRows.push({ ...l, error: "Invalid email format" });
        return null;
      }

      // Duplicate in CSV check
      if (emailSet.has(email)) {
        errorRows.push({ ...l, error: "Duplicate email in CSV" });
        return null;
      }
      emailSet.add(email);

      return {
        name,
        email,
        phone,
        status: l.status || "new",
        source: l.source || "Excel",
        assignedTo: null
      };
    }).filter(Boolean);

    // Step 2: Check Duplicate in DB
    const emails = cleanLeads.map(l => l.email);
    const existingLeads = await Lead.find({ email: { $in: emails } }).select("email");

    const existingEmailSet = new Set(existingLeads.map(l => l.email));

    const finalLeads = [];

    cleanLeads.forEach(l => {
      if (existingEmailSet.has(l.email)) {
        errorRows.push({ ...l, error: "Email already exists in DB" });
      } else {
        finalLeads.push(l);
      }
    });

    // Step 3: Insert Valid Leads
    if (finalLeads.length > 0) {
      await Lead.insertMany(finalLeads, { ordered: false });
    }

    // Step 4: Generate Error File (if any)
    if (errorRows.length > 0) {
      const headers = Object.keys(errorRows[0]).join(",");
      const rows = errorRows.map(r => Object.values(r).join(",")).join("\n");
      fs.writeFileSync("import_errors.csv", headers + "\n" + rows);
      console.log("Error report generated: import_errors.csv");
    }

    console.log("------ Import Summary ------");
    console.log("Total CSV Rows:", leads.length);
    console.log("Successfully Imported:", finalLeads.length);
    console.log("Failed Rows:", errorRows.length);

    process.exit();

  } catch (err) {
    console.error("Import failed:", err.message);
    process.exit(1);
  }
}

importLeads();
