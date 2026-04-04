const express = require('express');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const roleRoutes = require('./roleRoutes');
const categoryRoutes = require('./categoryRoutes');
const governorateRoutes = require('./governorateRoutes');
const branchRoutes = require('./branchRoutes');
const productRoutes = require('./productRoutes');
const productImageRoutes = require('./productImageRoutes');
const customerRoutes = require('./customerRoutes')
const orderRoutes = require('./orderRoutes');
const commissionRoutes = require('./commissionRoutes');
const employeeRoutes = require('./employeeRoutes');
const salaryRoutes = require('./salaryRequestRoutes')
const notificationRouter = require('./notificationRoutes');
const walletRoutes = require('./walletRoutes');
const statsRoutes = require('./statsRoutes');
const router = express.Router();

router.use('/api/wallet', walletRoutes);
router.use('/api', salaryRoutes);
router.use('/api', notificationRouter);
router.use('/api', customerRoutes);
router.use('/api',categoryRoutes);
router.use('/api', governorateRoutes);
router.use('/api', branchRoutes);
router.use('/api', productImageRoutes);
router.use('/api', roleRoutes);
router.use('/api', authRoutes);
router.use('/api', adminRoutes);
router.use('/api', employeeRoutes);
router.use('/api', productRoutes);
router.use('/api', orderRoutes);
router.use('/api', commissionRoutes);
router.use('/api/stats', statsRoutes);


module.exports = router;
