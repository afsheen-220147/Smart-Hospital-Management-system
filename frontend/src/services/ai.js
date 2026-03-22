import api from './api';

const AI_BASE = '/ai';

export const analyzeSymptoms = async (symptoms, patientHistory = {}) => {
  const response = await api.post(`${AI_BASE}/symptoms/analyze`, {
    symptoms,
    patientHistory
  });
  return response.data;
};

export const getDoctorsBySymptoms = async (symptoms) => {
  const response = await api.post(`${AI_BASE}/symptoms/doctors`, { symptoms });
  return response.data;
};

export const getSmartRecommendation = async (symptoms, preferredDate, specialization) => {
  const response = await api.post(`${AI_BASE}/appointment/recommend`, {
    symptoms,
    preferredDate,
    specialization
  });
  return response.data;
};

export const summarizeReport = async (formData) => {
  const response = await api.post(`${AI_BASE}/report/summarize`, formData);
  return response.data;
};

export const summarizeReportText = async (text, reportType = 'general') => {
  const response = await api.post(`${AI_BASE}/report/summarize`, {
    text,
    reportType
  });
  return response.data;
};

export const recommendDoctor = async (symptoms, specialization) => {
  const response = await api.post(`${AI_BASE}/doctor/recommend`, {
    symptoms,
    specialization
  });
  return response.data;
};

export const predictHealthRisk = async (data) => {
  const response = await api.post(`${AI_BASE}/health/risk`, data);
  return response.data;
};

export const detectEmergency = async (symptoms) => {
  const response = await api.post(`${AI_BASE}/emergency/detect`, { symptoms });
  return response.data;
};

export const chatWithAssistant = async (message, conversationHistory = []) => {
  const response = await api.post(`${AI_BASE}/chat`, {
    message,
    conversationHistory
  });
  return response.data;
};

export const getAppointmentSummary = async (appointmentId) => {
  const response = await api.get(`${AI_BASE}/appointment/${appointmentId}/summary`);
  return response.data;
};

export const getLoadBalancedDoctor = async (doctorId, requirements) => {
  const response = await api.post(`${AI_BASE}/doctor/load-balance`, {
    doctorId,
    requirements
  });
  return response.data;
};

export const chatbotResponse = async (message, history = []) => {
  try {
    const response = await chatWithAssistant(message, history);
    return {
      reply: response.data?.reply || 'I apologize, I could not process your request.',
      suggestedAction: response.data?.suggestedAction || null
    };
  } catch (error) {
    console.error('Chatbot error:', error);
    return {
      reply: "I'm having trouble connecting. Please try again later.",
      suggestedAction: null
    };
  }
};

export const summarizeText = async (text) => {
  try {
    const response = await summarizeReportText(text);
    const data = response.data;
    return {
      summary: data.summary || 'Unable to generate summary',
      recommendation: data.suggestedSpecialist || 'General Medicine',
      keyFindings: data.keyFindings || [],
      abnormalValues: data.abnormalValues || [],
      riskLevel: data.riskLevel || 'Unknown',
      nextSteps: data.nextSteps || []
    };
  } catch (error) {
    console.error('Summarize error:', error);
    return {
      summary: 'Unable to analyze the report. Please try again.',
      recommendation: 'General Medicine'
    };
  }
};

/**
 * Check prescription for drug interactions, allergies, and safety concerns
 */
export const checkPrescriptionSafety = async (prescription, patientId = null, patientInfo = null) => {
  try {
    const response = await api.post(`${AI_BASE}/prescription-check`, {
      prescription,
      patientId,
      patientInfo
    });
    return response.data;
  } catch (error) {
    console.error('Prescription safety check error:', error);
    return {
      success: false,
      data: {
        safetyStatus: 'warning',
        overallRisk: 'moderate',
        drugInteractions: [],
        allergyAlerts: [],
        dosageConcerns: [],
        contraindicatedConditions: [],
        recommendations: ['Unable to perform automated safety check - please verify manually'],
        summary: 'Safety check service unavailable. Please review prescription manually.'
      }
    };
  }
};

export default {
  analyzeSymptoms,
  getDoctorsBySymptoms,
  getSmartRecommendation,
  summarizeReport,
  summarizeReportText,
  recommendDoctor,
  predictHealthRisk,
  detectEmergency,
  chatWithAssistant,
  getAppointmentSummary,
  getLoadBalancedDoctor,
  chatbotResponse,
  summarizeText,
  checkPrescriptionSafety
};
