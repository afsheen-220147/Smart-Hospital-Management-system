const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const asyncHandler = require('express-async-handler');

// @desc    Get admin dashboard statistics
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
exports.getAdminStats = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // 12-month window for monthly chart
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalPatients,
    totalDoctors,
    todayAppointments,
    totalAppointments,
    recentAppointments,
    monthlyAgg,
    deptAgg,
    statusAgg,
  ] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Appointment.countDocuments({ date: { $gte: startOfDay, $lt: endOfDay } }),
    Appointment.countDocuments(),

    // Recent 6 appointments
    Appointment.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('patient', 'name')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } }),

    // Monthly appointment counts for last 12 months
    Appointment.aggregate([
      { $match: { date: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // Department distribution via doctor's specialization
    Appointment.aggregate([
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctor',
          foreignField: '_id',
          as: 'doctorInfo',
        },
      },
      { $unwind: { path: '$doctorInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$doctorInfo.specialization', 'General'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),

    // Status breakdown
    Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  // Build complete 12-month series (fill zeros for empty months)
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-indexed
    const found = monthlyAgg.find(m => m._id.year === year && m._id.month === month);
    monthlyData.push({
      month: d.toLocaleString('en-US', { month: 'short' }),
      year,
      appointments: found ? found.count : 0,
    });
  }

  // Department stats
  const departmentStats = deptAgg.map(d => ({
    dept: d._id || 'General',
    count: d.count,
  }));

  // Status map
  const statusMap = {};
  statusAgg.forEach(s => { statusMap[s._id] = s.count; });

  // Format recent appointments
  const recentFormatted = recentAppointments.map(a => ({
    _id: a._id,
    patient: a.patient?.name || 'Unknown',
    doctor: a.doctor?.user?.name || 'Unknown',
    date: a.date
      ? new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      : '',
    status: a.status,
  }));

  res.status(200).json({
    success: true,
    data: {
      totalPatients,
      totalDoctors,
      todayAppointments,
      totalAppointments,
      recentAppointments: recentFormatted,
      monthlyData,
      departmentStats,
      statusBreakdown: {
        pending: statusMap['pending'] || 0,
        confirmed: statusMap['confirmed'] || 0,
        inProgress: statusMap['in-progress'] || 0,
        completed: statusMap['completed'] || 0,
        cancelled: statusMap['cancelled'] || 0,
        noShow: statusMap['no-show'] || 0,
        upcoming:
          (statusMap['pending'] || 0) + (statusMap['confirmed'] || 0),
      },
    },
  });
});



//implemented analytics endpoints
//Endpoint = a URL where an API receives requests and sends back data.

//Code for csv export for reports has been written