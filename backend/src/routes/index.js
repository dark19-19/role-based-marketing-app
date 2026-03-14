const express = require('express');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const roleRoutes = require('./roleRoutes');
const router = express.Router();


router.use('/api', roleRoutes);
router.use('/api', authRoutes);
router.use('/api', adminRoutes);



module.exports = router;
