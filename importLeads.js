const mongoose = require("mongoose");
const csv = require("csvtojson");
const Lead = require("./models/lead");
require("dotenv").config();

async function importLeads() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const leads = await csv().fromFile("./leads.csv");

    const cleanLeads = leads
      .filter(l => l.email && l.email.trim() !== "")
      .map(l => ({
        name: l.name,
        email: l.email,
        phone: l.phone,
        status: l.status || "new",
        source: l.source || "Excel",
        assignedTo: null
      }));

    await Lead.insertMany(cleanLeads, { ordered: false });

    console.log("Leads imported successfully");
    process.exit();
  } catch (err) {
    console.error("Import failed:", err.message);
    process.exit(1);
  }
}

importLeads();