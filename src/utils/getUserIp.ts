// src/utils/getUserIp.ts
export const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', // Prevent caching to ensure fresh IP
    });
    if (!response.ok) {
      console.warn('Failed to fetch IP:', response.status, response.statusText);
      return '0.0.0.0'; // Fallback to valid inet value
    }
    const data = await response.json();
    const ip = data.ip;
    // Validate IPv4 or IPv6
    const ipRegex = /^(?:(?:[0-9]{1,3}\.){3}[0-9]{1,3}|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})$/;
    if (!ip || !ipRegex.test(ip)) {
      console.warn('Invalid IP format:', ip);
      return '0.0.0.0';
    }
    return ip;
  } catch (error) {
    console.error('Error fetching client IP:', error);
    return '0.0.0.0'; // Fallback to valid inet value
  }
};