async function forwardToHospitalSystem(record) {
  const endpoint = process.env.HOSPITAL_EMR_ENDPOINT;
  if (!endpoint) {
    return {
      forwarded: false,
      mode: 'local-only',
      target: null
    };
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (process.env.HOSPITAL_EMR_API_KEY) {
    headers.Authorization = `Bearer ${process.env.HOSPITAL_EMR_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    throw new Error(`Hospital system forwarding failed with status ${response.status}`);
  }

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch (error) {
    responseBody = await response.text();
  }

  return {
    forwarded: true,
    mode: 'external-emr',
    target: endpoint,
    response: responseBody
  };
}

module.exports = {
  forwardToHospitalSystem
};
