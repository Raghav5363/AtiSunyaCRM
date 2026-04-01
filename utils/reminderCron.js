const cron = require("node-cron");
const Lead = require("../models/Lead");

/* =========================
   REMINDER CRON JOB
   Runs every 1 minute
========================= */

const startReminderCron = () => {

  cron.schedule("* * * * *", async () => {
    console.log("⏰ Checking reminders...");

    try {
      const now = new Date();

      // Find leads where reminder is due & not sent
      const leads = await Lead.find({
        reminderDate: { $lte: now },
        reminderSent: false,
        isDeleted: false
      }).populate("assignedTo createdBy");

      if (leads.length === 0) return;

      console.log(`🔔 ${leads.length} reminders triggered`);

      for (const lead of leads) {

        // 👉 Here you can later send:
        // - Push notification
        // - Email
        // - Socket event

        console.log(`📢 Reminder for Lead: ${lead.name}`);

        // Mark as sent
        lead.reminderSent = true;
        await lead.save();
      }

    } catch (error) {
      console.error("❌ Reminder Cron Error:", error);
    }
  });

};

module.exports = startReminderCron;