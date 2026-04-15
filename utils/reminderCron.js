const cron = require("node-cron");
const Lead = require("../models/lead");
const { sendPushToUser } = require("./pushNotifications");

let reminderTask = null;
const reminderSchedule = process.env.REMINDER_CRON_SCHEDULE || "*/5 * * * * *";

const startReminderCron = () => {
  if (reminderTask) {
    return reminderTask;
  }

  reminderTask = cron.schedule(
    reminderSchedule,
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
          const userRoomId = lead.assignedTo ? lead.assignedTo.toString() : "";
          const connectedSocketCount = global.io
            ? userRoomId
              ? global.io.sockets.adapter.rooms.get(userRoomId)?.size || 0
              : global.io.sockets.sockets.size || 0
            : 0;
          const hasLiveSocketListener = connectedSocketCount > 0;

          if (global.io) {
            if (userRoomId) {
              global.io.to(userRoomId).emit("new_notification", payload);
            } else {
              global.io.emit("new_notification", payload);
            }
          }

          let pushResult = { sent: 0 };
          if (lead.assignedTo) {
            pushResult = await sendPushToUser(lead.assignedTo.toString(), {
              title: `${lead.name || "Lead"} reminder`,
              body: lead.notes || "Follow-up reminder needs attention.",
              tag: `lead-reminder-${lead._id}`,
              url: `/lead/${lead._id}`,
              channelId: "crm-reminders",
              clickAction: "OPEN_CRM_REMINDER",
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

          if (hasLiveSocketListener || pushResult.sent > 0) {
            bulkOps.push({
              updateOne: {
                filter: { _id: lead._id },
                update: { $set: { reminderSent: true, reminderRead: false } },
              },
            });
          } else {
            console.log(
              `[ReminderCron] Reminder kept pending for ${lead._id} because no live socket or push target was available`
            );
          }
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
