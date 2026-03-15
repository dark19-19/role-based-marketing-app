const express = require('express');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const roleRoutes = require('./roleRoutes');
const categoryRoutes = require('./categoryRoutes');
const governorateRoutes = require('./governorateRoutes');
const branchRoutes = require('./branchRoutes');
const productRoutes = require('./productRoutes');
const productImageRoutes = require('./productImageRoutes'); 
const router = express.Router();

router.use('/api',categoryRoutes);
router.use('/api', governorateRoutes);
router.use('/api', branchRoutes);
router.use('/api', productImageRoutes);
router.use('/api', roleRoutes);
router.use('/api', authRoutes);
router.use('/api', adminRoutes);
router.use('/api', productRoutes);


module.exports = router;
