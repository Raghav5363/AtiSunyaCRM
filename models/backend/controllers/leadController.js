const Lead = require("../models/Lead");

/* =============================
   DASHBOARD SUMMARY
============================= */

exports.getSummary = async (req, res) => {
  try {

    // ✅ SINGLE AGGREGATION (FASTER)
    const summary = await Lead.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // ✅ DEFAULT STRUCTURE
    const result = {
      total: 0,
      new: 0,
      followup: 0,
      not_interested: 0,
      junk: 0,
      closed: 0,
      site_visit_planned: 0,
      site_visit_done: 0,
    };

    // ✅ MAP DATA
    summary.forEach(item => {
      if (result.hasOwnProperty(item._id)) {
        result[item._id] = item.count;
      }
      result.total += item.count;
    });

    res.json(result);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Error fetching lead summary",
    });

  }
};