import 'server-only';

/**
 * IglooService class handling Igloo API operations for lock PIN generation
 */
export class IglooService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly deviceId: string;
  
  private readonly tokenEndpoint = "https://auth.igloohome.co/oauth2/token";
  private readonly apiBaseUrl = "https://api.igloodeveloper.co/igloohome/devices";

  constructor() {
    // Read credentials from environment variables for security
    this.clientId = process.env.IGLOO_CLIENT_ID || '';
    this.clientSecret = process.env.IGLOO_CLIENT_SECRET || '';
    
    // Device ID is dynamic and not sensitive, so it can be in env or hardcoded
    // If stored per stand in database, it can be passed as parameter instead
    this.deviceId = process.env.IGLOO_DEVICE_ID || 'SP2X24ec23e1';

    // Validate required environment variables (only sensitive credentials)
    if (!this.clientId || !this.clientSecret) {
      const missing = [];
      if (!this.clientId) missing.push('IGLOO_CLIENT_ID');
      if (!this.clientSecret) missing.push('IGLOO_CLIENT_SECRET');
      
      throw new Error(
        `Missing required Igloo environment variables: ${missing.join(', ')}. ` +
        'Please set them in your .env.local file or Vercel environment configuration.'
      );
    }
  }

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
   * Returns the raw API response
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
   * Extract and parse PIN from Igloo API response
   * Shared function used by both booking creation and API endpoint
   */
  extractAndParsePin(pinResult: Record<string, unknown>): number {
    // Extract PIN from response (could be 'pin', 'pinCode', 'code', or 'unlockCode')
    const pinValue: string | number | undefined = 
      (pinResult.pin as string | number | undefined) || 
      (pinResult.pinCode as string | number | undefined) || 
      (pinResult.code as string | number | undefined) || 
      (pinResult.unlockCode as string | number | undefined);
    
    if (!pinValue) {
      console.error('⚠️ PIN not found in Igloo API response:', pinResult);
      throw new Error('PIN not found in Igloo API response');
    }
    
    // Convert PIN to number (it might be a string)
    const parsedPin: number = typeof pinValue === 'string' ? parseInt(pinValue, 10) : Number(pinValue);
    
    if (isNaN(parsedPin)) {
      console.error('⚠️ Generated PIN is not a valid number:', pinValue);
      throw new Error('Invalid PIN format from Igloo API');
    }
    
    return parsedPin;
  }

  /**
   * Generate and parse a booking PIN as a number
   * This is the main function to use for booking creation
   * Validates the PIN and returns it as a number
   */
  async generateAndParseBookingPin(
    startDate: Date,
    endDate: Date,
    accessName: string = 'Customer'
  ): Promise<number> {
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`Invalid date format: start=${startDate.toISOString()}, end=${endDate.toISOString()}`);
    }

    // Validate date range
    if (endDate <= startDate) {
      throw new Error('endDate must be after startDate');
    }

    // Generate PIN
    const pinResult = await this.generateBookingPin(startDate, endDate, accessName);
    
    // Extract and parse using shared function
    const parsedPin = this.extractAndParsePin(pinResult);
    
    console.log('✅ Lock PIN generated and parsed successfully:', parsedPin);
    return parsedPin;
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

