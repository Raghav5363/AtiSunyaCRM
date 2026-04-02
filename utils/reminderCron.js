const cron = require("node-cron");
const Lead = require("../models/Lead");

/* =========================
   🔔 REMINDER CRON JOB (FINAL)
   Runs every 1 minute
========================= */

const startReminderCron = () => {

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      /* =========================
         GET DUE REMINDERS
      ========================== */

      const leads = await Lead.find({
        reminderDate: { $lte: now },
        reminderSent: false,
        isDeleted: false
      })
      .select("_id name purpose status reminderDate assignedTo")
      .lean(); // ✅ performance boost

      if (!leads.length) return;

      console.log(`🔔 ${leads.length} reminders triggered`);

      /* =========================
         PROCESS EACH LEAD
      ========================== */

      for (const lead of leads) {

        const notificationPayload = {
          _id: lead._id.toString(), // ✅ IMPORTANT (frontend safe)
          name: lead.name || "Lead",
          purpose: lead.purpose || "followup",
          status: lead.status || "new",
          reminderDate: lead.reminderDate,
        };

        /* =========================
           🔥 REAL-TIME SOCKET EMIT
        ========================== */

        if (global.io) {
          global.io.emit("new_notification", notificationPayload);
        }

        /* =========================
           MARK AS SENT
        ========================== */

        await Lead.updateOne(
          { _id: lead._id },
          { $set: { reminderSent: true } }
        );

      }

    } catch (error) {
      console.error("❌ Reminder Cron Error:", error.message);
    }
  });

};

module.exports = startReminderCron;