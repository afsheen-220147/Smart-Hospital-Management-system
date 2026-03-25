import React, { useState } from 'react';

const DoctorConsent = ({ patientId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [challengeData, setChallengeData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/v1/consent/doctor/challenge/${patientId}`);
      if (!response.ok) throw new Error('Failed to load challenge');
      const data = await response.json();
      setChallengeData(data);
      setSuccess(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSelect = async (selectedCode) => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/consent/doctor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challengeData.challengeId,
          selectedCode: selectedCode
        })
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-green-700 font-semibold">Access Granted</p>
      </div>
    );
  }

  if (!challengeData) {
    return (
      <div className="p-6 bg-white border border-gray-300 rounded-lg">
        <p className="text-gray-600 mb-4">Request patient's 2-digit code and select it below</p>
        <button
          onClick={loadChallenge}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Start Verification'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-300 rounded-lg">
      <h3 className="font-semibold text-gray-700 mb-4">Select Patient's Code</h3>
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {challengeData.options.map((code) => (
          <button
            key={code}
            onClick={() => handleCodeSelect(code)}
            disabled={loading}
            className="py-3 px-4 text-lg font-mono font-bold border-2 border-gray-300 rounded hover:border-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            {code}
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        disabled={loading}
        className="w-full text-gray-600 py-2 border border-gray-300 rounded hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  );
};

export default DoctorConsent;
