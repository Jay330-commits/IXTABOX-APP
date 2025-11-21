import 'server-only';

/**
 * IglooService class handling Igloo API operations for lock PIN generation
 */
export class IglooService {
  // Fixed credentials and device ID
  private readonly clientId = "uysufncu8quzbs0tjg61hxvkii";
  private readonly clientSecret = "9o8dakrhawv20xsnupsfhhxboo0gp9v3hdi6sjdbouarcszjkvw";
  private readonly deviceId = "SP2X24ec23e1";
  
  private readonly tokenEndpoint = "https://auth.igloohome.co/oauth2/token";
  private readonly apiBaseUrl = "https://api.igloodeveloper.co/igloohome/devices";

  /**
   * Encode credentials for Basic authentication
   */
  private getAuthHeader(): string {
    const encodedCredentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${encodedCredentials}`;
  }

  /**
   * Format date for Igloo API
   * Format: YYYY-MM-DDTHH:00:00+01:00 or +02:00 (Swedish timezone with DST)
   * Forces Europe/Stockholm timezone regardless of server location
   */
  private formatDate(date: Date): string {
    // Convert to Swedish timezone (Europe/Stockholm)
    const swedenTime = new Date(date.toLocaleString('en-US', { 
      timeZone: 'Europe/Stockholm' 
    }));
    
    const year = swedenTime.getFullYear();
    const month = String(swedenTime.getMonth() + 1).padStart(2, '0');
    const day = String(swedenTime.getDate()).padStart(2, '0');
    const hour = String(swedenTime.getHours()).padStart(2, '0');
    
    // Determine Swedish timezone offset (handles DST automatically)
    // Sweden is +01:00 in winter (CET), +02:00 in summer (CEST)
    const january = new Date(date.getFullYear(), 0, 1);
    const july = new Date(date.getFullYear(), 6, 1);
    const stdOffset = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset());
    const isDST = date.getTimezoneOffset() < stdOffset;
    
    // Use +02:00 during DST (summer), +01:00 otherwise (winter)
    const offsetHours = isDST ? '02' : '01';
    const offsetMinutes = '00';
    
    return `${year}-${month}-${day}T${hour}:00:00+${offsetHours}:${offsetMinutes}`;
  }

  /**
   * Get access token from Igloo OAuth2 endpoint
   */
  async getAccessToken(): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to get access token: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Access token not found in response');
    }

    return data.access_token;
  }

  /**
   * Generate a PIN for a booking period using the booking's startDate and endDate
   * Uses the hourly PIN endpoint which accepts custom date ranges
   */
  async generateBookingPin(
    startDate: Date,
    endDate: Date,
    accessName: string = 'Customer'
  ): Promise<Record<string, unknown>> {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiBaseUrl}/${this.deviceId}/algopin/hourly`;
    const formattedStartDate = this.formatDate(startDate);
    const formattedEndDate = this.formatDate(endDate);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, application/xml'
      },
      body: JSON.stringify({
        variance: 1,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        accessName: accessName
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to generate booking PIN: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('=== IGLOO API RESPONSE ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('Response keys:', Object.keys(result));
    console.log('PIN field:', result.pin || result.pinCode || result.code || result.unlockCode || 'NOT FOUND');
    console.log('==========================');
    return result;
  }

  /**
   * Generate a daily PIN for the lock
   */
  async generateDailyPin(accessName: string = 'Maintenance guy'): Promise<Record<string, unknown>> {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiBaseUrl}/${this.deviceId}/algopin/daily`;
    const now = new Date();
    // Daily pin requires endDate to be at least 29 days after startDate (max 367 days)
    const endDateObj = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startDate = this.formatDate(now);
    const endDate = this.formatDate(endDateObj);

    const response = await fetch(url, {
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
        accessName: accessName
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to generate daily PIN: ${response.status} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }
}

