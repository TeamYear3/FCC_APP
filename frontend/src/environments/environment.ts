export const environment = {
  production: true,
  googleClientId:
    (typeof window !== 'undefined' && (window as any).__env?.GOOGLE_CLIENT_ID) ||
    '637144883582-7q4v6mbbffp9b83m3f87n72gq4g7mkn3.apps.googleusercontent.com',
  apiUrl: 'https://api.fcc-app.com.ar/api',
  wsUrl: 'wss://api.fcc-app.com.ar/ws/ordenes/'
};

