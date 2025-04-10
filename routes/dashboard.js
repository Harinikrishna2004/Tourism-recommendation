const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth'); // Middleware to protect routes

router.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.session.user, title: "Dashboard" });
});

module.exports = router;
