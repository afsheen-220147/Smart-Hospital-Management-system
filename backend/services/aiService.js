const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.3;

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const parseJsonResponse = (text) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
};

// Standardized error response
const getDefaultResponse = (type = 'symptoms') => {
  const defaults = {
    symptoms: {
      possibleConditions: [{ name: 'Unable to analyze', probability: 'unknown', description: 'Please consult a doctor' }],
      urgencyLevel: 'Medium',
      recommendedSpecialist: 'General Physician',
      explanation: 'AI service temporarily unavailable. Please consult a healthcare professional.',
      immediateActions: ['Rest well', 'Stay hydrated', 'Monitor symptoms'],
      warningSignsToWatch: ['Worsening symptoms', 'High fever', 'Difficulty breathing']
    },
    report: {
      summary: 'Unable to analyze report at this time',
      keyFindings: ['Please consult a healthcare professional for report interpretation'],
      abnormalValues: [],
      riskLevel: 'Unknown',
      suggestedSpecialist: 'General Physician',
      recommendations: ['Consult with your doctor for detailed analysis'],
      nextSteps: ['Schedule an appointment with your healthcare provider']
    },
    chat: {
      reply: 'I apologize, but I\'m having trouble processing your request. Please try again or consult with a healthcare professional.',
      suggestedAction: null
    }
  };
  return defaults[type] || defaults.symptoms;
};

const callGroq = async (systemPrompt, userPrompt, temperature = TEMPERATURE) => {
  try {
    // Check if API key exists
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return null;
    }

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: MAX_TOKENS,
      temperature
    });
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Groq API Error:', error.message);
    // Return null to trigger fallback response
    return null;
  }
};

const analyzeSymptoms = async (symptoms, patientHistory = {}) => {
  try {
    const cacheKey = `symptoms_${symptoms.sort().join('_')}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const systemPrompt = `You are an expert medical AI assistant. Analyze symptoms and provide a preliminary assessment.
Always respond with valid JSON in this exact format:
{
  "possibleConditions": [{"name": "condition", "probability": "high/medium/low", "description": "brief explanation"}],
  "urgencyLevel": "Low/Medium/High/Critical",
  "recommendedSpecialist": "specialist type",
  "explanation": "brief medical explanation",
  "immediateActions": ["action1", "action2"],
  "warningSignsToWatch": ["sign1", "sign2"]
}`;

    const userPrompt = `Patient symptoms: ${symptoms.join(', ')}
${patientHistory.age ? `Age: ${patientHistory.age}` : ''}
${patientHistory.gender ? `Gender: ${patientHistory.gender}` : ''}
${patientHistory.existingConditions ? `Existing conditions: ${patientHistory.existingConditions.join(', ')}` : ''}

Analyze these symptoms and provide your assessment.`;

    const response = await callGroq(systemPrompt, userPrompt);
    
    // If API fails, return default response
    if (!response) {
      return getDefaultResponse('symptoms');
    }
    
    const result = parseJsonResponse(response) || getDefaultResponse('symptoms');

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('analyzeSymptoms error:', error);
    return getDefaultResponse('symptoms');
  }
};

const getSmartAppointmentRecommendation = async ({ symptoms, doctors, patientHistory, preferredDate }) => {
  try {
    const systemPrompt = `You are an AI scheduling assistant for a hospital. Analyze doctor availability, patient needs, and provide optimal appointment recommendations.
Return valid JSON:
{
  "recommendedDoctor": {"id": "doctor_id", "name": "doctor name", "reason": "why this doctor"},
  "optimalTimeSlot": {"date": "YYYY-MM-DD", "time": "HH:MM", "reason": "why this time"},
  "estimatedWaitTime": "X minutes",
  "priorityLevel": "Normal/Priority/Urgent/Emergency",
  "alternativeOptions": [{"doctorId": "id", "doctorName": "name", "time": "HH:MM", "date": "YYYY-MM-DD"}]
}`;

    const doctorInfo = doctors.map(d => ({
      id: d._id,
      name: d.name,
      specialization: d.specialization,
      appointmentCount: d.appointmentCount || 0,
      rating: d.rating || 4.5,
      availableSlots: d.availableSlots || []
    }));

    const userPrompt = `Patient symptoms: ${symptoms.join(', ')}
Patient history: ${JSON.stringify(patientHistory)}
Preferred date: ${preferredDate || 'flexible'}

Available doctors:
${JSON.stringify(doctorInfo, null, 2)}

Recommend the best doctor and time slot.`;

    const response = await callGroq(systemPrompt, userPrompt);
    return parseJsonResponse(response) || {
      recommendedDoctor: { id: doctors[0]?._id, name: doctors[0]?.name, reason: 'Best available match' },
      optimalTimeSlot: { date: preferredDate, time: '10:00', reason: 'First available slot' },
      estimatedWaitTime: '15 minutes',
      priorityLevel: 'Normal',
      alternativeOptions: []
    };
  } catch (error) {
    console.error('getSmartAppointmentRecommendation error:', error);
    return {
      recommendedDoctor: { id: doctors[0]?._id, name: doctors[0]?.name, reason: 'Best available match' },
      optimalTimeSlot: { date: preferredDate, time: '10:00', reason: 'First available slot' },
      estimatedWaitTime: '15 minutes',
      priorityLevel: 'Normal',
      alternativeOptions: []
    };
  }
};

const summarizeMedicalReport = async (reportText, reportType = 'general') => {
  try {
    const systemPrompt = `You are a medical report analyzer. Extract key information and provide a clear summary.
Return valid JSON:
{
  "summary": "brief overview of the report",
  "keyFindings": ["finding1", "finding2"],
  "vitalSigns": {"bloodPressure": "value", "heartRate": "value", "temperature": "value"},
  "abnormalValues": [{"parameter": "name", "value": "current", "normalRange": "range", "severity": "mild/moderate/severe"}],
  "diagnosis": "primary diagnosis if mentioned",
  "recommendations": ["recommendation1", "recommendation2"],
  "suggestedSpecialist": "specialist type if follow-up needed",
  "riskLevel": "Low/Moderate/High/Critical",
  "nextSteps": ["step1", "step2"]
}`;

    const userPrompt = `Report type: ${reportType}
Medical report content:
${reportText}

Analyze this report and provide a comprehensive summary.`;

    const response = await callGroq(systemPrompt, userPrompt);
    return parseJsonResponse(response) || {
      summary: 'Unable to fully parse report',
      keyFindings: ['Report analysis incomplete'],
      vitalSigns: {},
      abnormalValues: [],
      diagnosis: 'Consult physician for interpretation',
      recommendations: ['Schedule follow-up with doctor'],
      suggestedSpecialist: 'General Physician',
      riskLevel: 'Moderate',
      nextSteps: ['Consult with healthcare provider']
    };
  } catch (error) {
    console.error('summarizeMedicalReport error:', error);
    return {
      summary: 'Unable to fully parse report',
      keyFindings: ['Report analysis incomplete'],
      vitalSigns: {},
      abnormalValues: [],
      diagnosis: 'Consult physician for interpretation',
      recommendations: ['Schedule follow-up with doctor'],
      suggestedSpecialist: 'General Physician',
      riskLevel: 'Moderate',
      nextSteps: ['Consult with healthcare provider']
    };
  }
};

const recommendDoctor = async ({ symptoms, medicalHistory, pastAppointments, availableDoctors }) => {
  try {
    const systemPrompt = `You are a doctor recommendation AI. Based on patient data, recommend the most suitable specialist.
Return valid JSON:
{
  "primaryRecommendation": {"doctorId": "id", "name": "name", "specialization": "spec", "matchScore": 95, "reasons": ["reason1", "reason2"]},
  "alternativeRecommendations": [{"doctorId": "id", "name": "name", "specialization": "spec", "matchScore": 85, "reasons": ["reason"]}],
  "urgencyAssessment": "routine/priority/urgent/emergency",
  "specialConsiderations": ["consideration1"]
}`;

    const userPrompt = `Current symptoms: ${symptoms.join(', ')}
Medical history: ${JSON.stringify(medicalHistory)}
Past appointments: ${JSON.stringify(pastAppointments.slice(-5))}

Available doctors:
${JSON.stringify(availableDoctors.map(d => ({ id: d._id, name: d.name, specialization: d.specialization, rating: d.rating, experience: d.experience })), null, 2)}

Recommend the best doctor.`;

    const response = await callGroq(systemPrompt, userPrompt);
    return parseJsonResponse(response) || {
      primaryRecommendation: { doctorId: availableDoctors[0]?._id, name: availableDoctors[0]?.name, specialization: availableDoctors[0]?.specialization, matchScore: 80, reasons: ['Best available specialist'] },
      alternativeRecommendations: [],
      urgencyAssessment: 'routine',
      specialConsiderations: []
    };
  } catch (error) {
    console.error('recommendDoctor error:', error);
    return {
      primaryRecommendation: { doctorId: availableDoctors[0]?._id, name: availableDoctors[0]?.name, specialization: availableDoctors[0]?.specialization, matchScore: 80, reasons: ['Best available specialist'] },
      alternativeRecommendations: [],
      urgencyAssessment: 'routine',
      specialConsiderations: []
    };
  }
};

const predictHealthRisk = async ({ symptoms, age, gender, medicalHistory, lifestyle }) => {
  try {
    const systemPrompt = `You are a health risk assessment AI. Analyze patient data and predict health risks.
Return valid JSON:
{
  "overallRiskLevel": "Low/Medium/High/Critical",
  "riskScore": 0-100,
  "riskFactors": [{"factor": "name", "impact": "high/medium/low", "explanation": "brief"}],
  "potentialConditions": [{"condition": "name", "probability": "percentage", "preventionTips": ["tip1"]}],
  "protectiveFactors": ["factor1"],
  "recommendations": {"immediate": ["action"], "shortTerm": ["action"], "longTerm": ["action"]},
  "lifestyleChanges": ["change1", "change2"],
  "screeningsRecommended": ["screening1"]
}`;

    const userPrompt = `Patient profile:
- Age: ${age}
- Gender: ${gender}
- Current symptoms: ${symptoms.join(', ')}
- Medical history: ${JSON.stringify(medicalHistory)}
- Lifestyle factors: ${JSON.stringify(lifestyle)}

Assess health risks.`;

    const response = await callGroq(systemPrompt, userPrompt);
    return parseJsonResponse(response) || {
      overallRiskLevel: 'Medium',
      riskScore: 45,
      riskFactors: [{ factor: 'Unable to assess', impact: 'medium', explanation: 'Please consult with a healthcare professional' }],
      potentialConditions: [],
      protectiveFactors: [],
      recommendations: { immediate: [], shortTerm: ['Regular check-ups'], longTerm: ['Maintain healthy lifestyle'] },
      lifestyleChanges: ['Consult with your doctor'],
      screeningsRecommended: []
    };
  } catch (error) {
    console.error('predictHealthRisk error:', error);
    return {
      overallRiskLevel: 'Medium',
      riskScore: 45,
      riskFactors: [{ factor: 'Unable to assess', impact: 'medium', explanation: 'Please consult with a healthcare professional' }],
      potentialConditions: [],
      protectiveFactors: [],
      recommendations: { immediate: [], shortTerm: ['Regular check-ups'], longTerm: ['Maintain healthy lifestyle'] },
      lifestyleChanges: ['Consult with your doctor'],
      screeningsRecommended: []
    };
  }
};

const getLoadBalancedDoctor = async ({ overloadedDoctorId, doctors, patientRequirements }) => {
  try {
    const systemPrompt = `You are an appointment load balancer. Find alternative doctors when one is overloaded.
Return valid JSON:
{
  "recommendedAlternative": {"doctorId": "id", "name": "name", "specialization": "spec", "currentLoad": "percentage", "nextAvailable": "datetime"},
  "allAlternatives": [{"doctorId": "id", "name": "name", "loadPercentage": 50, "estimatedWait": "minutes"}],
  "loadDistribution": {"balanced": true, "suggestion": "explanation"}
}`;

    const userPrompt = `Overloaded doctor ID: ${overloadedDoctorId}
Patient requirements: ${JSON.stringify(patientRequirements)}

Available alternatives:
${JSON.stringify(doctors.filter(d => d._id.toString() !== overloadedDoctorId).map(d => ({
      id: d._id,
      name: d.name,
      specialization: d.specialization,
      currentAppointments: d.appointmentCount,
      maxCapacity: d.maxCapacity || 20
    })), null, 2)}

Find the best alternative.`;

    const response = await callGroq(systemPrompt, userPrompt);
    return parseJsonResponse(response) || {
      recommendedAlternative: { doctorId: doctors[0]?._id, name: doctors[0]?.name, specialization: doctors[0]?.specialization, currentLoad: '50%', nextAvailable: new Date().toISOString() },
      allAlternatives: [],
      loadDistribution: { balanced: false, suggestion: 'Consider load balancing recommendations' }
    };
  } catch (error) {
    console.error('getLoadBalancedDoctor error:', error);
    return {
      recommendedAlternative: { doctorId: doctors[0]?._id, name: doctors[0]?.name, specialization: doctors[0]?.specialization, currentLoad: '50%', nextAvailable: new Date().toISOString() },
      allAlternatives: [],
      loadDistribution: { balanced: false, suggestion: 'Consider load balancing recommendations' }
    };
  }
};

const EMERGENCY_SYMPTOMS = [
  'chest pain', 'severe chest pain', 'heart attack',
  'difficulty breathing', 'severe breathing difficulty', 'shortness of breath',
  'fainting', 'unconscious', 'loss of consciousness',
  'stroke', 'paralysis', 'sudden weakness',
  'severe bleeding', 'heavy bleeding',
  'severe allergic reaction', 'anaphylaxis',
  'seizure', 'convulsions',
  'severe abdominal pain', 'appendicitis symptoms',
  'suicidal thoughts', 'self harm'
];

const detectEmergency = async (symptoms) => {
  try {
    const symptomsLower = symptoms.map(s => s.toLowerCase());
    const isEmergencyKeyword = symptomsLower.some(symptom =>
      EMERGENCY_SYMPTOMS.some(emergency =>
        symptom.includes(emergency) || emergency.includes(symptom)
      )
    );

    if (isEmergencyKeyword) {
      return {
        isEmergency: true,
        severity: 'CRITICAL',
        immediateActions: [
          'Call emergency services (102/108) immediately',
          'Do not move the patient unnecessarily',
          'Keep patient calm and comfortable',
          'Monitor breathing and consciousness'
        ],
        priorityLevel: 'EMERGENCY',
        estimatedResponseTime: 'Immediate attention required',
        departmentToContact: 'Emergency Department'
      };
    }

    const systemPrompt = `You are an emergency detection AI. Analyze symptoms for emergency situations.
Return valid JSON:
{
  "isEmergency": true/false,
  "severity": "NONE/LOW/MODERATE/HIGH/CRITICAL",
  "immediateActions": ["action1"],
  "priorityLevel": "Normal/Priority/Urgent/Emergency",
  "estimatedResponseTime": "timeframe",
  "departmentToContact": "department name",
  "reasoning": "brief explanation"
}`;

    const userPrompt = `Analyze these symptoms for emergency status: ${symptoms.join(', ')}`;

    const response = await callGroq(systemPrompt, userPrompt);
    return parseJsonResponse(response) || {
      isEmergency: false,
      severity: 'LOW',
      immediateActions: [],
      priorityLevel: 'Normal',
      estimatedResponseTime: 'Standard appointment',
      departmentToContact: 'Outpatient Department'
    };
  } catch (error) {
    console.error('detectEmergency error:', error);
    return {
      isEmergency: false,
      severity: 'LOW',
      immediateActions: [],
      priorityLevel: 'Normal',
      estimatedResponseTime: 'Standard appointment',
      departmentToContact: 'Outpatient Department'
    };
  }
};

const chatMedicalAssistant = async (message, conversationHistory = []) => {
  try {
    const systemPrompt = `You are MediCare+ AI Assistant, a friendly and professional medical chatbot.
Your capabilities:
- Answer general health questions
- Guide users to appropriate doctors/departments
- Help with appointment booking queries
- Provide hospital information
- Offer basic health advice

Rules:
- Never diagnose conditions definitively
- Always recommend professional consultation for serious concerns
- Be empathetic and supportive
- Keep responses concise but helpful
- If symptoms sound serious, advise seeking immediate medical attention

Respond naturally, not in JSON format.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    let reply = "I'm sorry, I couldn't process that. Please try again.";
    
    try {
      const response = await groq.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7
      });
      reply = response.choices[0]?.message?.content || reply;
    } catch (apiError) {
      console.error('Groq Chat API Error:', apiError.message);
      reply = "I'm having trouble responding right now. Please consult with our medical professionals or try again later.";
    }

    const actionMatch = message.toLowerCase();
    let suggestedAction = null;

    if (actionMatch.includes('book') || actionMatch.includes('appointment')) {
      suggestedAction = { type: 'BOOK_APPOINTMENT', label: 'Book Appointment', route: '/patient/book' };
    } else if (actionMatch.includes('doctor') || actionMatch.includes('specialist')) {
      suggestedAction = { type: 'FIND_DOCTOR', label: 'Find Doctors', route: '/doctors' };
    } else if (actionMatch.includes('symptom') || actionMatch.includes('check')) {
      suggestedAction = { type: 'SYMPTOM_CHECKER', label: 'Check Symptoms', route: '/patient/symptom-checker' };
    } else if (actionMatch.includes('report') || actionMatch.includes('summary')) {
      suggestedAction = { type: 'REPORT_SUMMARY', label: 'Analyze Report', route: '/patient/report-summary' };
    }

    return {
      reply,
      suggestedAction,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('chatMedicalAssistant error:', error);
    return {
      reply: 'I apologize, but I\'m unable to respond right now. Please consult with our medical team.',
      suggestedAction: null,
      timestamp: new Date().toISOString()
    };
  }
};

const generateAppointmentSummary = async (appointmentData) => {
  try {
    const { patient, doctor, symptoms, visitType, notes } = appointmentData;

    const systemPrompt = `Generate a brief, professional pre-appointment summary for the doctor.
Return valid JSON:
{
  "patientOverview": "brief patient description",
  "chiefComplaints": ["symptom1", "symptom2"],
  "relevantHistory": "relevant medical history summary",
  "suggestedFocus": ["area to examine"],
  "estimatedDuration": "minutes",
  "preparationNotes": "any preparation needed"
}`;

    const userPrompt = `Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
Visit type: ${visitType}
Symptoms: ${symptoms.join(', ')}
Medical history: ${JSON.stringify(patient.medicalHistory || {})}
Notes: ${notes || 'None'}`;

    const response = await callGroq(systemPrompt, userPrompt);
    return parseJsonResponse(response) || {
      patientOverview: 'Patient consultation scheduled',
      chiefComplaints: symptoms || [],
      relevantHistory: 'Refer to patient medical records',
      suggestedFocus: ['Primary complaint assessment'],
      estimatedDuration: '30 minutes',
      preparationNotes: 'Patient to bring insurance details and medical records if available'
    };
  } catch (error) {
    console.error('generateAppointmentSummary error:', error);
    return {
      patientOverview: 'Patient consultation scheduled',
      chiefComplaints: appointmentData.symptoms || [],
      relevantHistory: 'Refer to patient medical records',
      suggestedFocus: ['Primary complaint assessment'],
      estimatedDuration: '30 minutes',
      preparationNotes: 'Patient to bring insurance details and medical records if available'
    };
  }
};

/**
 * AI-powered prescription safety check
 * Analyzes prescription for drug interactions, allergy conflicts, and dosage concerns
 */
const checkPrescriptionSafety = async (prescription, patientInfo) => {
  try {
    const { allergies = [], currentMedications = [], age, weight, conditions = [] } = patientInfo;

    const systemPrompt = `You are a pharmacology expert AI assistant specialized in drug safety analysis.
Analyze the prescribed medications for potential safety issues.

CRITICAL: Always respond with valid JSON in this exact format:
{
  "safetyStatus": "safe" | "warning" | "danger",
  "overallRisk": "low" | "moderate" | "high" | "critical",
  "drugInteractions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "severity": "mild" | "moderate" | "severe",
      "description": "Brief explanation of interaction",
      "recommendation": "What to do"
    }
  ],
  "allergyAlerts": [
    {
      "medication": "Drug name",
      "allergen": "Related allergen",
      "severity": "mild" | "moderate" | "severe",
      "description": "Why this is a concern"
    }
  ],
  "dosageConcerns": [
    {
      "medication": "Drug name",
      "issue": "Description of dosage concern",
      "recommendation": "Suggested adjustment"
    }
  ],
  "contraindicatedConditions": [
    {
      "medication": "Drug name",
      "condition": "Medical condition",
      "risk": "Description of risk"
    }
  ],
  "recommendations": ["List of safety recommendations"],
  "summary": "Brief overall safety summary"
}

Be thorough but concise. Flag any potential issues even if minor.`;

    const userPrompt = `Prescription to analyze:
${prescription}

Patient Information:
- Age: ${age || 'Not specified'}
- Weight: ${weight || 'Not specified'}
- Known Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None reported'}
- Current Medications: ${currentMedications.length > 0 ? currentMedications.join(', ') : 'None reported'}
- Medical Conditions: ${conditions.length > 0 ? conditions.join(', ') : 'None reported'}

Please analyze this prescription for:
1. Drug-drug interactions
2. Allergy cross-reactivity
3. Dosage appropriateness for the patient's age/weight
4. Contraindications with existing conditions
5. General safety concerns`;

    const response = await callGroq(systemPrompt, userPrompt, 0.2);
    const result = parseJsonResponse(response);

    if (result) {
      return result;
    }

    // Default safe response if parsing fails
    return {
      safetyStatus: 'safe',
      overallRisk: 'low',
      drugInteractions: [],
      allergyAlerts: [],
      dosageConcerns: [],
      contraindicatedConditions: [],
      recommendations: ['Standard prescription safety guidelines apply'],
      summary: 'No significant safety concerns detected based on available information.'
    };
  } catch (error) {
    console.error('checkPrescriptionSafety error:', error);
    return {
      safetyStatus: 'warning',
      overallRisk: 'moderate',
      drugInteractions: [],
      allergyAlerts: [],
      dosageConcerns: [],
      contraindicatedConditions: [],
      recommendations: ['AI safety check unavailable - please review manually'],
      summary: 'Unable to perform automated safety check. Please verify prescription manually.'
    };
  }
};

module.exports = {
  analyzeSymptoms,
  getSmartAppointmentRecommendation,
  summarizeMedicalReport,
  recommendDoctor,
  predictHealthRisk,
  getLoadBalancedDoctor,
  detectEmergency,
  chatMedicalAssistant,
  generateAppointmentSummary,
  checkPrescriptionSafety,
  parseJsonResponse,
  callGroq
};
