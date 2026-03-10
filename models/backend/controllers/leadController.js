const Lead = require("../models/Lead");

/* =============================
   DASHBOARD SUMMARY
============================= */

exports.getSummary = async (req, res) => {
  try {

    const total = await Lead.countDocuments();

    const newLeads = await Lead.countDocuments({ status: "new" });
    const followup = await Lead.countDocuments({ status: "followup" });
    const notInterested = await Lead.countDocuments({ status: "not_interested" });
    const junk = await Lead.countDocuments({ status: "junk" });
    const closed = await Lead.countDocuments({ status: "closed" });
    const siteVisitPlanned = await Lead.countDocuments({ status: "site_visit_planned" });
    const siteVisitDone = await Lead.countDocuments({ status: "site_visit_done" });

    res.json({
      total,
      new: newLeads,
      followup,
      not_interested: notInterested,
      junk,
      closed,
      site_visit_planned: siteVisitPlanned,
      site_visit_done: siteVisitDone,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Error fetching lead summary",
    });

  }
};