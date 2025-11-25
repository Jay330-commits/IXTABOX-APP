    flowchart TD
        A[Guest visits /guest page] --> B[View Google Maps with Stands]
        B --> C{User selects stand?}
        C -->|Yes| D[Stand Details Modal Opens]
        C -->|No| B
        D --> E[User selects dates/times]
        E --> F[User clicks Book Now]
        F --> G[Navigate to /payment with params: standId, startDate, endDate, startTime, endTime, amount]
        G --> H[Payment Page Loads]
        H --> I[Create Payment Intent API]
        I --> J[Stripe Payment Form Renders]
        J --> K{User submits payment?}
        K -->|No| J
        K -->|Yes| L[Stripe processes payment]
        L --> M{Payment successful?}
        M -->|No| N[Show error message]
        N --> J
        M -->|Yes| O[Update Payment Intent with metadata]
        O --> P[Redirect to /payment/success]
        P --> Q[Success Page Loads]
        Q --> R[Fetch booking details from API]
        R --> S[Generate Igloo PIN]
        S --> T[Display PIN to user]
        T --> U[Booking Complete]
        
        style A fill:#e1f5ff
        style U fill:#c8e6c9
        style N fill:#ffcdd2


    sequenceDiagram
        participant User
        participant PaymentPage
        participant PaymentAPI
        participant Stripe
        participant SuccessPage
        participant Webhook

        User->>PaymentPage: Navigate with booking params
        PaymentPage->>PaymentAPI: POST /api/create-payment-intent with amount, currency, metadata
        PaymentAPI->>Stripe: Create PaymentIntent
        Stripe-->>PaymentAPI: clientSecret, paymentIntentId
        PaymentAPI-->>PaymentPage: Return clientSecret
        PaymentPage->>PaymentPage: Render Stripe Elements
        User->>PaymentPage: Enter payment details
        User->>PaymentPage: Submit payment form
        PaymentPage->>Stripe: confirmPayment()
        Stripe->>Stripe: Process payment
        alt Payment Succeeded
            Stripe-->>PaymentPage: Payment succeeded
            PaymentPage->>PaymentAPI: PATCH /api/create-payment-intent - update metadata with email/phone
            PaymentAPI->>Stripe: Update PaymentIntent metadata
            PaymentPage->>SuccessPage: Redirect with params
            Stripe->>Webhook: POST /api/webhooks/stripe - payment_intent.succeeded event
        else Payment Failed
            Stripe-->>PaymentPage: Payment failed
            PaymentPage->>User: Show error message
        end


    flowchart TD
        A[Payment Success Page] --> B[Extract booking dates from URL params]
        B --> C{Valid dates?}
        C -->|No| D[Use current date/time as default]
        C -->|Yes| E[Use provided dates]
        D --> F[Format dates as ISO strings]
        E --> F
        F --> G[POST /api/igloo/generate-pin with startDate, endDate, accessName]
        G --> H[API Route: Parse dates as UTC]
        H --> I[IglooService.generateBookingPin]
        I --> J[Get Igloo Access Token]
        J --> K{Token valid?}
        K -->|No| L[Retry authentication]
        L --> J
        K -->|Yes| M[Format dates to Swedish timezone: YYYY-MM-DDTHH:00:00+hh:mm]
        M --> N[Round to nearest hour]
        N --> O[Calculate timezone offset - DST aware]
        O --> P[POST to Igloo API: /algopin/hourly]
        P --> Q{Igloo response OK?}
        Q -->|No| R[Return error to client]
        Q -->|Yes| S[Extract PIN and pinId]
        S --> T[Return to API route]
        T --> U[Return to client]
        U --> V[Display PIN to user]
        V --> W[Save PIN to database via webhook or success page]
        
        style A fill:#e1f5ff
        style V fill:#c8e6c9
        style R fill:#ffcdd2


    flowchart TD
        A[Stripe sends webhook event] --> B[POST /api/webhooks/stripe]
        B --> C[Verify webhook signature]
        C --> D{Signature valid?}
        D -->|No| E[Return 400 error]
        D -->|Yes| F[Parse event type]
        F --> G{Event type?}
        G -->|payment_intent.succeeded| H[Extract PaymentIntent]
        G -->|Other events| I[Log and ignore]
        H --> J[Extract metadata: standId, startDate, endDate, etc.]
        J --> K[Find or create Booking record]
        K --> L[Update Booking status to 'confirmed']
        L --> M[Generate Igloo PIN]
        M --> N[Save PIN to Booking record]
        N --> O[Send confirmation email if emailNotification enabled]
        O --> P[Return 200 OK]
        
        style A fill:#fff3e0
        style P fill:#c8e6c9
        style E fill:#ffcdd2


    erDiagram
        Customer ||--o{ Booking : "has"
        Stand ||--o{ Booking : "has"
        Distributor ||--o{ Stand : "owns"
        Distributor ||--o{ Customer : "manages"
        
        Customer {
            string id PK
            string email
            string phone
            string name
            datetime createdAt
            datetime updatedAt
        }
        
        Stand {
            string id PK
            string distributorId FK
            string locationId FK
            decimal pricePerDay
            string status
            json metadata
            datetime createdAt
            datetime updatedAt
        }
        
        Booking {
            string id PK
            string standId FK
            string customerId FK
            string paymentIntentId
            datetime startDate
            datetime endDate
            string status
            string pin
            string pinId
            datetime pinGeneratedAt
            datetime createdAt
            datetime updatedAt
        }
        
        Distributor {
            string id PK
            string email
            string companyName
            string phone
            datetime createdAt
            datetime updatedAt
        }
        
        Location {
            string id PK
            string address
            float latitude
            float longitude
            datetime createdAt
            datetime updatedAt
        }


    graph LR
        subgraph "Public Routes"
            A1[/guest - Guest landing page]
            A2[/api/stands - Get all stands]
            A3[/api/stands/:id - Get stand details]
            A4[/api/guest - Guest data]
        end
        
        subgraph "Payment Routes"
            B1[/payment - Payment page]
            B2[/payment/success - Success page]
            B3[/api/create-payment-intent - Create PI]
            B4[/api/payment-intent/:id - Get PI]
            B5[/api/payment/validate-success - Validate]
            B6[/api/webhooks/stripe - Webhook handler]
        end
        
        subgraph "Igloo Routes"
            C1[/api/igloo/generate-pin - Generate PIN]
            C2[/igloo-test - Test page]
        end
        
        subgraph "Booking Routes"
            D1[/api/bookings/by-payment-intent - Get booking]
        end
        
        subgraph "Auth Routes"
            E1[/auth/login - Login page]
            E2[/auth/signup - Signup page]
            E3[/api/auth/login - Login API]
            E4[/api/auth/register - Register API]
            E5[/api/auth/me - Get current user]
        end
        
        A1 --> A2
        A1 --> A3
        B1 --> B3
        B2 --> C1
        B2 --> D1
        B6 --> C1
        B6 --> D1


    graph TD
        A[App Layout] --> B[Guest Page]
        A --> C[Payment Page]
        A --> D[Success Page]
        A --> E[Auth Pages]
        
        B --> F[GuestHeader]
        B --> G[GoogleMap Component]
        B --> H[BookingFilterForm]
        B --> I[StandDetails Modal]
        
        G --> I
        I --> J[Book Now Button]
        J --> C
        
        C --> K[StripeBankPayment]
        C --> F
        C --> L[Footer]
        
        D --> F
        D --> M[PIN Display]
        D --> L
        
        K --> N[Stripe Elements]
        N --> O[Payment Method Input]
        
        style A fill:#e3f2fd
        style B fill:#e1f5ff
        style C fill:#fff3e0
        style D fill:#c8e6c9


    sequenceDiagram
        participant U as User
        participant G as Guest Page
        participant M as Map Component
        participant P as Payment Page
        participant S as Stripe
        participant API as Payment API
        participant SU as Success Page
        participant I as Igloo API
        participant DB as Database

        U->>G: Visit /guest
        G->>API: GET /api/stands
        API->>DB: Query stands
        DB-->>API: Return stands
        API-->>G: Stands data
        G->>M: Display on map
        U->>M: Click stand marker
        M->>U: Show stand details
        U->>M: Select dates & book
        M->>P: Navigate with params
        P->>API: POST /api/create-payment-intent
        API->>S: Create PaymentIntent
        S-->>API: clientSecret
        API-->>P: Return clientSecret
        P->>U: Show payment form
        U->>P: Enter payment details
        U->>P: Submit payment
        P->>S: confirmPayment()
        S->>S: Process payment
        S-->>P: Payment succeeded
        P->>API: PATCH /api/create-payment-intent - update metadata
        P->>SU: Redirect to /payment/success
        SU->>API: GET /api/bookings/by-payment-intent
        API->>DB: Query booking
        DB-->>API: Booking data
        API-->>SU: Booking details
        SU->>API: POST /api/igloo/generate-pin
        API->>I: Generate PIN with dates
        I-->>API: PIN + pinId
        API-->>SU: PIN data
        SU->>U: Display PIN
        S->>API: Webhook: payment_intent.succeeded
        API->>DB: Update booking status
        API->>I: Generate PIN (if not already done)
        I-->>API: PIN
        API->>DB: Save PIN to booking


    flowchart TD
        A[User Action] --> B{Action Type?}
        B -->|Payment| C[Payment Processing]
        B -->|PIN Generation| D[PIN Generation]
        B -->|API Call| E[API Request]
        
        C --> F{Payment Success?}
        F -->|No| G[Show error message]
        F -->|Yes| H[Continue flow]
        
        D --> I{PIN Generated?}
        I -->|No| J[Log error]
        J --> K[Show error to user]
        I -->|Yes| L[Display PIN]
        
        E --> M{Response OK?}
        M -->|No| N[Handle API error]
        N --> O[Show user-friendly message]
        M -->|Yes| P[Process response]
        
        G --> Q[Allow retry]
        K --> Q
        O --> Q
        
        style G fill:#ffcdd2
        style K fill:#ffcdd2
        style O fill:#ffcdd2
        style H fill:#c8e6c9
        style L fill:#c8e6c9
        style P fill:#c8e6c9


## Partner/Distributor Dashboard Benefits

The partner page (distributor dashboard) provides comprehensive business management tools that help distributors:

**Real-Time Operations Management**
- Track active stands, bookings, and revenue in real-time
- Monitor box inventory status across all locations (available, in-use, scheduled, maintenance)
- View detailed rental statistics and performance metrics

**Business Growth Tools**
- Manage multiple stands and expand operations through account upgrades
- Access marketing tools and campaigns to increase bookings
- Review and manage contracts with flexible business models (Hybrid, Leasing, Owning)

**Operational Efficiency**
- Centralized dashboard showing key metrics: active stands, monthly rentals, earnings, and contract status
- Quick actions for inventory management, marketing campaigns, and contract review
- Export capabilities for data analysis and reporting

**Revenue Optimization**
- Track revenue per booking and overall earnings
- Monitor booking trends and customer usage patterns
- Identify opportunities for stand expansion and optimization

This comprehensive platform enables distributors to efficiently manage their IXTAbox rental business, make data-driven decisions, and scale their operations effectively.


## Customer Booking Experience (Interface View)

IXTAbox keeps the booking journey lightweight and visual so guests always know where they are in the flow:

**1. Discover & Compare**
- `/guest` loads an interactive Google Map plus `BookingFilterForm`, letting visitors filter by date, size, or location without typing stand IDs.
- Clicking any stand marker instantly opens the `StandDetails` modal with pricing, availability, photos, and amenities so shoppers can compare options side-by-side.

**2. Configure & Commit**
- The modal keeps date/time pickers, add-ons, and the prominent `Book Now` CTA in the same viewport. When users click `Book Now`, we navigate to `/payment` carrying all context (standId, dates, price) so nothing must be re-entered.
- The payment screen reuses `GuestHeader` and `Footer`, reinforcing continuity, and focuses the center of the page on `StripeBankPayment`, which renders Stripe Elements with clear validation states.

**3. Pay & Receive Access**
- Once payment succeeds, users are auto-redirected to `/payment/success`, where the success layout reuses familiar components plus a dedicated PIN display card. The page also explains next steps and shows booking metadata retrieved from `/api/bookings/by-payment-intent`.
- Behind the scenes the success page triggers `/api/igloo/generate-pin`, but from the guest’s perspective the PIN simply appears within seconds, avoiding any “check your email later” friction.

**Utility Highlights**
- Zero dead-ends: every screen contains next-step CTAs (Book, Pay, View PIN, Manage bookings).
- Error handling is friendly—validation hints stay inline, and failed payments return to the form with preserved inputs.
- Mobile-first layouts (stacked cards, full-width buttons) keep the experience usable on phones tourists typically carry while traveling.