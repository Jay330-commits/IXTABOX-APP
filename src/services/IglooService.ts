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
    // Get the date components in Swedish timezone
    const swedenFormatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false
    });
    
    const parts = swedenFormatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    
    // Calculate timezone offset more reliably
    // Get the UTC timestamp (milliseconds since epoch)
    const utcTime = date.getTime();
    
    // Format the date as if it were in Stockholm timezone, then parse it back
    // This gives us what the Stockholm time components would be
    const stockholmDateStr = date.toLocaleString('sv-SE', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Parse Stockholm time components
    const [datePart, timePart] = stockholmDateStr.split(' ');
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const [hourStr, minuteStr, secondStr] = timePart.split(':');
    
    // Create a Date object assuming these components are in UTC
    // This gives us the UTC time that would produce these Stockholm time components
    const stockholmAsUTC = Date.UTC(
      parseInt(yearStr),
      parseInt(monthStr) - 1,
      parseInt(dayStr),
      parseInt(hourStr),
      parseInt(minuteStr),
      parseInt(secondStr)
    );
    
    // The difference between UTC time and Stockholm-as-UTC is the offset
    // If Stockholm is ahead (later), offset is positive
    const offsetMs = utcTime - stockholmAsUTC;
    const offsetHours = Math.round(offsetMs / (1000 * 60 * 60));
    
    // Normalize offset (Sweden is +1 or +2 hours ahead)
    // If offset is negative, it means Stockholm is ahead (positive offset)
    const normalizedOffset = -offsetHours;
    
    // Clamp to valid Sweden offsets (should be 1 or 2, but handle edge cases)
    const finalOffset = normalizedOffset === 2 ? 2 : 1;
    const offsetStr = `+${String(finalOffset).padStart(2, '0')}:00`;
    
    const result = `${year}-${month}-${day}T${hour}:00:00${offsetStr}`;
    console.log(`[IglooService] Formatting date: Input=${date.toISOString()}, Stockholm time=${stockholmDateStr}, Offset calc=${offsetHours}, Normalized=${normalizedOffset}, Final=${finalOffset}, Result=${result}`);
    
    return result;
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

