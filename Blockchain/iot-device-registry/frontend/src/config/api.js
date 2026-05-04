const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL;

const normalizeBaseUrl = (value) => {
  if (!value) {
    return 'http://localhost:5000/api';
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const API_BASE = normalizeBaseUrl(configuredBaseUrl);

export const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
