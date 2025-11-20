"use client";

import { useState } from 'react';

export default function IglooTestPage() {
  // Step 1: Obtain Your API Credentials
  const clientId = "uysufncu8quzbs0tjg61hxvkii";
  const clientSecret = "9o8dakrhawv20xsnupsfhhxboo0gp9v3hdi6sjdbouarcszjkvw";
  const deviceId = "SP2X24ec23e1";

  // Step 2: Encode Your Credentials
  // Concatenate: client_id:client_secret
  // Base64 encode: Base64Encode(client_id:client_secret)
  const encodedCredentials = btoa(`${clientId}:${clientSecret}`);
  // Use in Authorization header as: Basic {credentials}
  const authHeader = `Basic ${encodedCredentials}`;

  const [tokenResult, setTokenResult] = useState<Record<string, unknown> | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [pinResult, setPinResult] = useState<Record<string, unknown> | null>(null);

  const handleGetToken = async () => {
    // Make a POST request to the token endpoint with your encoded credentials
    // Endpoint: POST https://auth.igloohome.co/oauth2/token
    const params = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    const response = await fetch('https://auth.igloohome.co/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await response.json();
    setTokenResult(data);
    if (data.access_token) {
      setAccessToken(data.access_token);
    }
  };

  const formatDate = (date: Date) => {
    // Format: YYYY-MM-DDTHH:00:00+hh:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const timezoneOffset = -date.getTimezoneOffset();
    const offsetHours = String(Math.floor(timezoneOffset / 60)).padStart(2, '0');
    const offsetMinutes = String(timezoneOffset % 60).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:00:00+${offsetHours}:${offsetMinutes}`;
  };

  const handleCreatePin = async () => {
    if (!accessToken) return;

    const url = `https://api.igloodeveloper.co/igloohome/devices/${deviceId}/algopin/onetime`;
    const now = new Date();
    const startDate = formatDate(now);
    
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, application/xml'
      },
      body: JSON.stringify({
        variance: 1,
        startDate: startDate,
        accessName: 'Maintenance guy'
      })
    };

    const response = await fetch(url, options);
    const data = await response.json();
    setPinResult(data);
  };

  const handleCreateHourlyPin = async () => {
    if (!accessToken) return;

    const url = `https://api.igloodeveloper.co/igloohome/devices/${deviceId}/algopin/hourly`;
    const now = new Date();
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const startDate = formatDate(now);
    const endDate = formatDate(nextDay);
    
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, application/xml'
      },
      body: JSON.stringify({
        variance: 1,
        startDate: startDate,
        endDate: endDate,
        accessName: 'Maintenance guy'
      })
    };

    const response = await fetch(url, options);
    const data = await response.json();
    setPinResult(data);
  };

  const handleCreateDailyPin = async () => {
    if (!accessToken) return;

    const url = `https://api.igloodeveloper.co/igloohome/devices/${deviceId}/algopin/daily`;
    const now = new Date();
    // Daily pin requires endDate to be at least 29 days after startDate (max 367 days)
    const endDateObj = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startDate = formatDate(now);
    const endDate = formatDate(endDateObj);
    
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, application/xml'
      },
      body: JSON.stringify({
        variance: 1,
        startDate: startDate,
        endDate: endDate,
        accessName: 'Maintenance guy'
      })
    };

    const response = await fetch(url, options);
    const data = await response.json();
    setPinResult(data);
  };

  return (
    <div>
      <button onClick={handleGetToken}>Get Token</button>
      {tokenResult && <pre>{JSON.stringify(tokenResult, null, 2)}</pre>}
      
      {accessToken && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px' }}>
            <button onClick={handleCreatePin}>One-Time PIN</button>
            <button onClick={handleCreateHourlyPin}>Hourly PIN</button>
            <button onClick={handleCreateDailyPin}>Daily PIN</button>
          </div>
          {pinResult && <pre style={{ marginTop: '20px' }}>{JSON.stringify(pinResult, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}