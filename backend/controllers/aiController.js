const aiService = require('../services/aiService');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const reportParser = require('../utils/reportParser');

const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, patientHistory } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one symptom'
      });
    }

    const emergency = await aiService.detectEmergency(symptoms);
    if (emergency.isEmergency) {
      return res.status(200).json({
        success: true,
        data: {
          ...emergency,
          analysis: null,
          message: 'EMERGENCY DETECTED - Seek immediate medical attention'
        }
      });
    }

    const analysis = await aiService.analyzeSymptoms(symptoms, patientHistory || {});

    res.status(200).json({
      success: true,
      data: {
        isEmergency: false,
        analysis
      }
    });
  } catch (error) {
    console.error('Symptom analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze symptoms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getSmartRecommendation = async (req, res) => {
  try {
    const { symptoms, preferredDate, specialization } = req.body;
    const patientId = req.user?.id;

    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide symptoms for recommendation'
      });
    }

    let query = { isActive: true };
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    const doctors = await Doctor.find(query)
      .select('name specialization workingHours consultationTypes rating experience')
      .lean();

    const doctorsWithLoad = await Promise.all(doctors.map(async (doc) => {
      const appointmentCount = await Appointment.countDocuments({
        doctor: doc._id,
        date: preferredDate || { $gte: new Date() },
        status: { $in: ['confirmed', 'in-progress'] }
      });
      return { ...doc, appointmentCount };
    }));

    let patientHistory = {};
    if (patientId) {
      const patient = await Patient.findOne({ user: patientId }).lean();
      if (patient) {
        patientHistory = {
          age: patient.age,
          gender: patient.gender,
          existingConditions: patient.medicalHistory?.conditions || []
        };
      }
    }

    const recommendation = await aiService.getSmartAppointmentRecommendation({
      symptoms,
      doctors: doctorsWithLoad,
      patientHistory,
      preferredDate
    });

    res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Smart recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const summarizeReport = async (req, res) => {
  try {
    let reportText = req.body.text;
    const reportType = req.body.reportType || 'general';

    if (req.file) {
      reportText = await reportParser.parseFile(req.file);
    }

    if (!reportText || reportText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Please provide report text or upload a valid file'
      });
    }

    const summary = await aiService.summarizeMedicalReport(reportText, reportType);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Report summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to summarize report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const recommendDoctor = async (req, res) => {
  try {
    const { symptoms, specialization } = req.body;
    const patientId = req.user?.id;

    let query = { isActive: true };
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    const availableDoctors = await Doctor.find(query)
      .select('name specialization rating experience qualifications')
      .lean();

    let medicalHistory = {};
    let pastAppointments = [];

    if (patientId) {
      const patient = await Patient.findOne({ user: patientId }).lean();
      if (patient) {
        medicalHistory = patient.medicalHistory || {};
      }

      pastAppointments = await Appointment.find({ patient: patientId })
        .populate('doctor', 'name specialization')
        .sort({ date: -1 })
        .limit(10)
        .lean();
    }

    const recommendation = await aiService.recommendDoctor({
      symptoms: symptoms || [],
      medicalHistory,
      pastAppointments,
      availableDoctors
    });

    res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Doctor recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recommend doctor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const predictHealthRisk = async (req, res) => {
  try {
    const { symptoms, lifestyle } = req.body;
    const patientId = req.user?.id;

    let patientData = {
      age: req.body.age || 30,
      gender: req.body.gender || 'unknown'
    };

    let medicalHistory = req.body.medicalHistory || {};

    if (patientId) {
      const patient = await Patient.findOne({ user: patientId }).lean();
      if (patient) {
        patientData.age = patient.age || patientData.age;
        patientData.gender = patient.gender || patientData.gender;
        medicalHistory = { ...patient.medicalHistory, ...medicalHistory };
      }
    }

    const riskAssessment = await aiService.predictHealthRisk({
      symptoms: symptoms || [],
      age: patientData.age,
      gender: patientData.gender,
      medicalHistory,
      lifestyle: lifestyle || {}
    });

    res.status(200).json({
      success: true,
      data: riskAssessment
    });
  } catch (error) {
    console.error('Health risk prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict health risk',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getLoadBalancedDoctor = async (req, res) => {
  try {
    const { doctorId, requirements } = req.body;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide doctor ID'
      });
    }

    const overloadedDoctor = await Doctor.findById(doctorId).lean();
    if (!overloadedDoctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const alternativeDoctors = await Doctor.find({
      _id: { $ne: doctorId },
      specialization: overloadedDoctor.specialization,
      isActive: true
    }).lean();

    const doctorsWithLoad = await Promise.all(alternativeDoctors.map(async (doc) => {
      const appointmentCount = await Appointment.countDocuments({
        doctor: doc._id,
        date: { $gte: new Date() },
        status: { $in: ['confirmed', 'in-progress'] }
      });
      return { ...doc, appointmentCount, maxCapacity: 20 };
    }));

    const recommendation = await aiService.getLoadBalancedDoctor({
      overloadedDoctorId: doctorId,
      doctors: doctorsWithLoad,
      patientRequirements: requirements || {}
    });

    res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Load balancing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find alternative doctor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const detectEmergency = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide symptoms'
      });
    }

    const emergencyStatus = await aiService.detectEmergency(symptoms);

    res.status(200).json({
      success: true,
      data: emergencyStatus
    });
  } catch (error) {
    console.error('Emergency detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assess emergency status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const chatAssistant = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message'
      });
    }

    const response = await aiService.chatMedicalAssistant(
      message,
      conversationHistory || []
    );

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Chat assistant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAppointmentSummary = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name age gender medicalHistory')
      .populate('doctor', 'name specialization')
      .lean();

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const summary = await aiService.generateAppointmentSummary({
      patient: {
        name: appointment.patient?.name,
        age: appointment.patient?.age,
        gender: appointment.patient?.gender,
        medicalHistory: appointment.patient?.medicalHistory
      },
      doctor: appointment.doctor,
      symptoms: appointment.symptoms || [],
      visitType: appointment.visitType,
      notes: appointment.notes
    });

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Appointment summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getDoctorsBySymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide symptoms'
      });
    }

    const analysis = await aiService.analyzeSymptoms(symptoms, {});
    const recommendedSpecialist = analysis.recommendedSpecialist;

    const doctors = await Doctor.find({
      isActive: true,
      specialization: new RegExp(recommendedSpecialist, 'i')
    })
      .select('name specialization rating experience qualifications image')
      .sort({ rating: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        analysis,
        recommendedDoctors: doctors
      }
    });
  } catch (error) {
    console.error('Get doctors by symptoms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find doctors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Check prescription safety (drug interactions, allergies, dosage)
 * @route   POST /api/v1/ai/prescription-check
 * @access  Private/Doctor
 */
const checkPrescriptionSafety = async (req, res) => {
  try {
    const { prescription, patientId, patientInfo } = req.body;

    if (!prescription || prescription.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide prescription text to analyze'
      });
    }

    // Build patient info from provided data or fetch from DB
    let patientData = patientInfo || {};

    if (patientId && !patientInfo) {
      try {
        const patient = await Patient.findOne({ user: patientId }).lean();
        if (patient) {
          patientData = {
            age: patient.age || patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth)) / 31557600000) : null,
            weight: patient.weight,
            allergies: patient.allergies || [],
            currentMedications: patient.currentMedications || [],
            conditions: patient.medicalHistory?.conditions || []
          };
        }
      } catch (e) {
        console.warn('Could not fetch patient data:', e.message);
      }
    }

    const safetyResult = await aiService.checkPrescriptionSafety(prescription, patientData);

    res.status(200).json({
      success: true,
      data: safetyResult
    });
  } catch (error) {
    console.error('Prescription safety check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform prescription safety check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  analyzeSymptoms,
  getSmartRecommendation,
  summarizeReport,
  recommendDoctor,
  predictHealthRisk,
  getLoadBalancedDoctor,
  detectEmergency,
  chatAssistant,
  getAppointmentSummary,
  getDoctorsBySymptoms,
  checkPrescriptionSafety
};
