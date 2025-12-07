import 'server-only';
import Stripe from 'stripe';
import { BaseService } from '../BaseService';

/**
 * StripeService
 * Handles general Stripe payment operations (not booking-specific)
 * Provides reusable Stripe functionality for any payment use case
 */
export class StripeService extends BaseService {
  private stripe: Stripe;

  constructor() {
    super();
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  /**
   * Get Stripe client instance
   */
  getStripe(): Stripe {
    return this.stripe;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
    paymentMethodTypes?: string[];
    customerId?: string;
  }): Promise<Stripe.PaymentIntent> {
    return await this.logOperation(
      'CREATE_PAYMENT_INTENT',
      async () => {
        try {
          const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(params.amount * 100), // Convert to cents
            currency: params.currency || 'sek',
            automatic_payment_methods: {
              enabled: true,
            },
            metadata: params.metadata || {},
            payment_method_types: params.paymentMethodTypes,
            customer: params.customerId,
          });

          console.log('Stripe payment intent created:', paymentIntent.id);
          return paymentIntent;
        } catch (stripeError) {
          console.error('Stripe API error:', {
            error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
            stack: stripeError instanceof Error ? stripeError.stack : undefined,
            type: stripeError instanceof Stripe.errors.StripeError ? stripeError.type : undefined,
            code: stripeError instanceof Stripe.errors.StripeError ? stripeError.code : undefined,
          });
          throw new Error(`Stripe error: ${stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'}`);
        }
      },
      'StripeService.createPaymentIntent'
    );
  }

  /**
   * Retrieve payment intent from Stripe
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
    options?: { expand?: string[] }
  ): Promise<Stripe.PaymentIntent> {
    return await this.logOperation(
      'RETRIEVE_PAYMENT_INTENT',
      async () => {
        try {
          const paymentIntent = await this.stripe.paymentIntents.retrieve(
            paymentIntentId,
            options || {}
          );
          return paymentIntent;
        } catch (error: unknown) {
          // Handle Stripe-specific errors
          if (error instanceof Stripe.errors.StripeError) {
            if (error.type === 'StripeConnectionError') {
              console.error('Stripe connection error - possible causes:', {
                message: error.message,
                paymentIntentId,
                suggestion: 'Check network connectivity, firewall settings, or Stripe API status',
              });
              throw new Error(`Stripe connection failed: ${error.message}. Please check your network connection and Stripe API status.`);
            }
            if (error.code === 'resource_missing') {
              throw new Error('Payment intent not found in Stripe');
            }
            if (error.type === 'StripeAuthenticationError') {
              throw new Error('Stripe authentication failed. Please check your STRIPE_SECRET_KEY.');
            }
            if (error.type === 'StripeAPIError') {
              throw new Error(`Stripe API error: ${error.message}`);
            }
          }
          
          // Handle generic errors
          if (typeof error === 'object' && error !== null) {
            const errWithCode = error as { code?: unknown; message?: string };
            if (errWithCode.code === 'resource_missing') {
              throw new Error('Payment intent not found in Stripe');
            }
          }
          
          console.error('Error retrieving payment intent from Stripe:', {
            error: error instanceof Error ? error.message : String(error),
            paymentIntentId,
            errorType: error instanceof Stripe.errors.StripeError ? error.type : 'Unknown',
          });
          throw error;
        }
      },
      'StripeService.retrievePaymentIntent'
    );
  }

  /**
   * Verify payment intent exists and has valid status
   */
  async verifyPaymentIntent(paymentIntentId: string): Promise<{
    exists: boolean;
    paymentIntent?: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      livemode: boolean;
    };
  }> {
    return await this.logOperation(
      'VERIFY_PAYMENT_INTENT',
      async () => {
        try {
          const paymentIntent = await this.retrievePaymentIntent(paymentIntentId);
          return {
            exists: true,
            paymentIntent: {
              id: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              livemode: paymentIntent.livemode,
            },
          };
        } catch (error) {
          if (error instanceof Error && error.message === 'Payment intent not found in Stripe') {
            return { exists: false };
          }
          throw error;
        }
      },
      'StripeService.verifyPaymentIntent'
    );
  }

  /**
   * Update payment intent metadata
   */
  async updatePaymentIntentMetadata(
    paymentIntentId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    return await this.logOperation(
      'UPDATE_PAYMENT_INTENT_METADATA',
      async () => {
        try {
          const paymentIntent = await this.stripe.paymentIntents.update(paymentIntentId, {
            metadata,
          });
          console.log('Payment intent metadata updated:', paymentIntentId);
          return paymentIntent;
        } catch (error) {
          console.error('Failed to update payment intent metadata:', error);
          throw error;
        }
      },
      'StripeService.updatePaymentIntentMetadata'
    );
  }

  /**
   * Create a refund for a payment intent
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason
  ): Promise<Stripe.Refund> {
    return await this.logOperation(
      'CREATE_REFUND',
      async () => {
        try {
          // First retrieve the payment intent to get the charge ID
          const paymentIntent = await this.retrievePaymentIntent(paymentIntentId);
          
          if (!paymentIntent.latest_charge) {
            throw new Error('No charge found for this payment intent');
          }

          const refundParams: Stripe.RefundCreateParams = {
            charge: paymentIntent.latest_charge as string,
            reason: reason,
          };

          if (amount !== undefined) {
            refundParams.amount = Math.round(amount * 100); // Convert to cents
          }

          const refund = await this.stripe.refunds.create(refundParams);
          console.log('Refund created:', refund.id);
          return refund;
        } catch (error) {
          console.error('Failed to create refund:', error);
          throw error;
        }
      },
      'StripeService.createRefund'
    );
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async getOrCreateCustomer(email: string, name?: string, phone?: string): Promise<Stripe.Customer> {
    return await this.logOperation(
      'GET_OR_CREATE_CUSTOMER',
      async () => {
        try {
          // Search for existing customer by email
          const existingCustomers = await this.stripe.customers.list({
            email: email,
            limit: 1,
          });

          if (existingCustomers.data.length > 0) {
            return existingCustomers.data[0];
          }

          // Create new customer
          const customer = await this.stripe.customers.create({
            email,
            name,
            phone,
          });

          console.log('Stripe customer created:', customer.id);
          return customer;
        } catch (error) {
          console.error('Failed to get or create customer:', error);
          throw error;
        }
      },
      'StripeService.getOrCreateCustomer'
    );
  }

  /**
   * List payment intents (for admin/debugging)
   */
  async listPaymentIntents(limit: number = 10): Promise<Stripe.PaymentIntent[]> {
    return await this.logOperation(
      'LIST_PAYMENT_INTENTS',
      async () => {
        try {
          const paymentIntents = await this.stripe.paymentIntents.list({
            limit,
          });
          return paymentIntents.data;
        } catch (error) {
          console.error('Failed to list payment intents:', error);
          throw error;
        }
      },
      'StripeService.listPaymentIntents'
    );
  }

  /**
   * Extract billing details from payment intent
   */
  extractBillingDetails(paymentIntent: Stripe.PaymentIntent): {
    email: string | null;
    name: string | null;
    phone: string | null;
    address: Stripe.Address | null;
  } {
    // Try multiple sources for email (in order of reliability)
    let email: string | null = null;
    
    // 1. Check receipt_email (most reliable - set by Stripe or us)
    if (paymentIntent.receipt_email) {
      email = paymentIntent.receipt_email;
    }
    
    // 2. Check payment method billing details (if expanded)
    const paymentMethod = paymentIntent.payment_method as
      | Stripe.PaymentMethod
      | string
      | null
      | undefined;

    const billingDetails = typeof paymentMethod === 'object' && paymentMethod
      ? paymentMethod.billing_details
      : null;

    if (!email && billingDetails?.email) {
      email = billingDetails.email;
    }
    
    // 3. Check metadata (from our contact form)
    if (!email && paymentIntent.metadata?.customerEmail) {
      email = paymentIntent.metadata.customerEmail;
    }

    return {
      email,
      name: billingDetails?.name || null,
      phone: billingDetails?.phone || null,
      address: billingDetails?.address || null,
    };
  }
}

