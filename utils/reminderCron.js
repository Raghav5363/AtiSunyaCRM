const cron = require("node-cron");
const Lead = require("../models/lead");

let reminderTask = null;

const startReminderCron = () => {
  if (reminderTask) {
    return reminderTask;
  }

  reminderTask = cron.schedule(
    "* * * * *",
    async () => {
      try {
        const now = new Date();

        const leads = await Lead.find({
          reminderDate: { $ne: null, $lte: now },
          reminderSent: false,
          isDeleted: false,
        })
          .select("_id name purpose status reminderDate assignedTo notes")
          .lean();

        if (!leads.length) {
          console.log("[ReminderCron] No reminders due");
          return;
        }

        console.log(`[ReminderCron] ${leads.length} reminder(s) triggered`);

        const bulkOps = [];

        for (const lead of leads) {
          const payload = {
            _id: lead._id.toString(),
            name: lead.name || "Lead",
            purpose: lead.purpose || "followup",
            status: lead.status || "new",
            notes: lead.notes || "",
            reminderDate: lead.reminderDate,
          };

          if (global.io) {
            if (lead.assignedTo) {
              global.io.to(lead.assignedTo.toString()).emit("new_notification", payload);
            } else {
              global.io.emit("new_notification", payload);
            }
          }

          bulkOps.push({
            updateOne: {
              filter: { _id: lead._id },
              update: { $set: { reminderSent: true, reminderRead: false } },
            },
          });
        }

        if (bulkOps.length) {
          await Lead.bulkWrite(bulkOps);
        }
      } catch (error) {
        console.error("[ReminderCron] Error:", error);
      }
    },
    {
      name: "lead-reminder-cron",
      noOverlap: true,
      timezone: process.env.CRON_TIMEZONE || "Asia/Kolkata",
    }
  );

  console.log("[ReminderCron] Started");
  return reminderTask;
};

module.exports = startReminderCron;
