const cron = require("node-cron");
const Lead = require("../models/lead");
const { sendPushToUser } = require("./pushNotifications");

let reminderTask = null;

const startReminderCron = () => {
  if (reminderTask) {
    return reminderTask;
  }

  reminderTask = cron.schedule(
    "*/15 * * * * *",
    async () => {
      try {
        const now = new Date();

        const leads = await Lead.find({
          reminderSent: false,
          isDeleted: false,
          $or: [
            { reminderDate: { $ne: null, $lte: now } },
            { reminderDate: null, nextFollowUpDate: { $ne: null, $lte: now } },
          ],
        })
          .select("_id name purpose status reminderDate nextFollowUpDate assignedTo notes")
          .lean();

        if (!leads.length) {
          console.log("[ReminderCron] No reminders due");
          return;
        }

        console.log(`[ReminderCron] ${leads.length} reminder(s) triggered`);

        const bulkOps = [];

        for (const lead of leads) {
          const effectiveReminderDate = lead.reminderDate || lead.nextFollowUpDate || null;
          const payload = {
            _id: lead._id.toString(),
            name: lead.name || "Lead",
            purpose: lead.purpose || "followup",
            status: lead.status || "new",
            notes: lead.notes || "",
            reminderDate: effectiveReminderDate,
          };

          if (global.io) {
            if (lead.assignedTo) {
              global.io.to(lead.assignedTo.toString()).emit("new_notification", payload);
            } else {
              global.io.emit("new_notification", payload);
            }
          }

          if (lead.assignedTo) {
            await sendPushToUser(lead.assignedTo.toString(), {
              title: `${lead.name || "Lead"} reminder`,
              body: lead.notes || "Follow-up reminder needs attention.",
              tag: `lead-reminder-${lead._id}`,
              url: `/lead/${lead._id}`,
              icon: "/app-icon-192.png",
              badge: "/app-icon-192.png",
              data: {
                leadId: lead._id.toString(),
                reminderDate: effectiveReminderDate,
                purpose: lead.purpose || "followup",
                status: lead.status || "new",
              },
            });
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
