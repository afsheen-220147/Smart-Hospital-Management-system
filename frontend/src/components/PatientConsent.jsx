import React, { useState, useEffect } from 'react';

const PatientConsent = ({ patientId }) => {
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCode = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/consent/patient/code/${patientId}`);
      if (!response.ok) throw new Error('Failed to fetch code');
      const data = await response.json();
      setCode(data.code);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCode();
    const interval = setInterval(fetchCode, 3 * 60 * 1000); // Refresh every 3 minutes
    return () => clearInterval(interval);
  }, [patientId]);

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-semibold text-gray-700 mb-2">Your Verification Code</h3>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="text-3xl font-mono font-bold text-blue-600 text-center py-4 bg-white rounded border-2 border-blue-300">
          {code}
        </div>
      )}
      <p className="text-sm text-gray-500 mt-2">Code updates every 3 minutes</p>
    </div>
  );
};

export default PatientConsent;
