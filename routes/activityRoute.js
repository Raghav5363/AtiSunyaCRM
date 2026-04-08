const express = require("express");
const Activity = require("../models/activity");
const Lead = require("../models/Lead");
const User = require("../models/user");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

const applyActivityRoleFilter = async (req, filter = {}) => {
  const scopedFilter = { ...filter };

  if (req.user.role === "admin") {
    return scopedFilter;
  }

  if (req.user.role === "sales_agent") {
    scopedFilter.createdBy = req.user.id;
    return scopedFilter;
  }

  if (req.user.role === "sales_manager") {
    const agents = await User.find({ role: "sales_agent" }).select("_id");
    scopedFilter.createdBy = {
      $in: [req.user.id, ...agents.map((agent) => agent._id.toString())],
    };
  }

  return scopedFilter;
};

/* =========================
   TODAY FOLLOW-UPS
========================= */
router.get("/today", protect, async (req, res) => {
  try {

    const start = new Date();
    start.setHours(0,0,0,0);

    const end = new Date();
    end.setHours(23,59,59,999);

    const filter = await applyActivityRoleFilter(req, {
      nextFollowUpDate: { $gte: start, $lte: end }
    })
    const activities = await Activity.find(filter)
    .populate({
      path: "leadId",
      select: "name phone assignedTo createdAt reminderDate notes status purpose"
    })
    .sort({ nextFollowUpDate: 1 });

    res.json(activities);

  } catch (err) {

    console.error("TODAY FOLLOWUP ERROR:", err);
    res.status(500).json({ message: err.message });

  }
});


/* =========================
   OVERDUE FOLLOWUPS
========================= */
router.get("/overdue", protect, async (req, res) => {

  try {

    const today = new Date();
    today.setHours(0,0,0,0);

    const filter = await applyActivityRoleFilter(req, {
      nextFollowUpDate: { $lt: today }
    })
    const activities = await Activity.find(filter)
    .populate("leadId","name phone")
    .sort({ nextFollowUpDate: 1 });

    res.json(activities);

  } catch (err) {

    console.error("OVERDUE ERROR:", err);
    res.status(500).json({ message: err.message });

  }

});


/* =========================
   ADD ACTIVITY
========================= */
router.post(
  "/:leadId",
  protect,
  allowRoles("admin","sales_manager","sales_agent"),
  async (req,res)=>{

    try{

      const {
        activityType,
        activityDateTime,
        outcome,
        notes,
        nextFollowUpDate
      } = req.body;

      if(!activityType || !activityDateTime){
        return res.status(400).json({message:"Activity type and date required"});
      }

      const lead = await Lead.findById(req.params.leadId);

      if(!lead){
        return res.status(404).json({message:"Lead not found"});
      }

      const activity = await Activity.create({

        leadId:req.params.leadId,

        activityType,

        activityDateTime: new Date(activityDateTime),

        outcome: outcome || "",

        notes: notes || "",

        nextFollowUpDate: nextFollowUpDate
          ? new Date(nextFollowUpDate)
          : null,

        createdBy:req.user.id

      });

      if(nextFollowUpDate){
        const followUpDate = new Date(nextFollowUpDate);
        lead.nextFollowUpDate = followUpDate;
        lead.reminderDate = followUpDate;
        lead.reminderSent = false;
        lead.reminderRead = false;
      }

      if(notes){
        lead.notes = notes;
      }

      if(activityDateTime){
        lead.lastContactedAt = new Date(activityDateTime);
      }

      if(activityType){
        lead.purpose = activityType === "whatsapp" ? "followup" : activityType;
      }

      await lead.save();

      res.status(201).json(activity);

    }
    catch(err){

      console.error("ADD ACTIVITY ERROR:",err);

      res.status(500).json({message:err.message});

    }

});


/* =========================
   GET ACTIVITIES BY LEAD
========================= */
router.get("/:leadId", protect, async (req,res)=>{

  try{

    const activities = await Activity.find({
      leadId:req.params.leadId
    })
    .populate("createdBy","email role")
    .sort({activityDateTime:-1});

    res.json(activities);

  }
  catch(err){

    console.error("GET BY LEAD ERROR:",err);

    res.status(500).json({message:err.message});

  }

});

module.exports = router;
