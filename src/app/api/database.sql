-- ENUMS
CREATE TYPE role AS ENUM ('GUEST', 'CUSTOMER', 'DISTRIBUTOR', 'ADMIN');
CREATE TYPE stand_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE contract_type AS ENUM ('HYBRID', 'LEASING', 'OWNING', 'BASIC');
CREATE TYPE contract_status AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED');

-- ======================================================
-- USERS (Core authentication and identity)
-- ======================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address JSONB,
  role role NOT NULL DEFAULT 'GUEST',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);


-- ======================================================
-- CUSTOMERS
-- ======================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  loyalty_points INT DEFAULT 0,
  preferences JSONB
);

-- ======================================================
-- DISTRIBUTORS
-- ======================================================
CREATE TABLE distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  reg_number TEXT NOT NULL,
  website TEXT,
  contact_person TEXT NOT NULL,
  business_type TEXT NOT NULL,
  years_in_business TEXT,
  expected_monthly_bookings TEXT,
  marketing_channels TEXT[] DEFAULT '{}',
  business_description TEXT,
  contract_type contract_type DEFAULT 'HYBRID',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- ======================================================
-- ADMINS
-- ======================================================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_level INT DEFAULT 1,
  permissions JSONB DEFAULT '[]'::jsonb
);


-- ======================================================
-- STANDS
-- ======================================================
CREATE TABLE stands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  coordinates JSONB,
  status stand_status DEFAULT 'AVAILABLE',
  capacity INT DEFAULT 1,
  features JSONB,
  pricing JSONB,
  owner_id UUID REFERENCES distributors(id) ON DELETE SET NULL
);



-- ======================================================
-- BOOKINGS
-- ======================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  stand_id UUID REFERENCES stands(id) ON DELETE CASCADE,
  payment_id UUID UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  status booking_status DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT now()
);


-- PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'SEK',
  status payment_status DEFAULT 'PENDING',
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);



-- REVIEWS
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stand_id UUID NOT NULL REFERENCES stands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  related_booking_id UUID NULL REFERENCES bookings(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- DISTRIBUTOR FINANCIALS
CREATE TABLE distributor_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_earnings DECIMAL DEFAULT 0,
  pending_payout DECIMAL DEFAULT 0,
  total_bookings INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CONTRACTS (for DISTRIBUTORS)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type contract_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  terms JSONB,
  status contract_status DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


-- PAYMENT METHODS
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  provider VARCHAR,
  last_four CHAR(4),
  expiration_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PROMOTIONS
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR UNIQUE NOT NULL,
  description TEXT,
  discount_type discount_type NOT NULL,
  discount_value DECIMAL NOT NULL,
  max_uses INT DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PLATFORM SETTINGS
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CONTRACTS (for DISTRIBUTORS)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type contract_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  terms JSONB,
  status contract_status DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  payment_id UUID UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);












