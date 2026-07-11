const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { getDashboardStats, getExecutionTrend } = require("../controllers/dashboard.controller");

router.use(auth);
router.get("/stats", getDashboardStats);
router.get("/execution-trend", getExecutionTrend);

module.exports = router;
