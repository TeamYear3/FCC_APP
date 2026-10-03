export const environment = {
  production: false,
  googleClientId:
    (typeof window !== 'undefined' && (window as any).__env?.GOOGLE_CLIENT_ID) ||
    '637144883582-7q4v6mbbffp9b83m3f87n72gq4g7mkn3.apps.googleusercontent.com',
  apiUrl: 'http://localhost:8000/api'
};

