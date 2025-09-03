const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getNotes } = require("../controllers/noteController");

router.get("/", auth, getNotes);

module.exports = router;
