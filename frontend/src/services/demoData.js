// Pre-seeded demo dataset for Brightloop Software — Subscription Management System
// Designed for the Odoo x Flux Hackathon 2026

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'Brightloop ERP Core Suite',
    type: 'Variant Product',
    salesPrice: 1200,
    costPrice: 450,
    notes: 'Base enterprise resource planning module. Includes financials, CRM, and basic inventory.',
    variants: [
      { id: 'var-core-std', name: 'Standard Edition', extraPrice: 0, brand: 'Standard' },
      { id: 'var-core-odoo', name: 'Odoo Connected Edition', extraPrice: 560, brand: 'Odoo' }, // Exact requirement: Odoo brand adds +560
      { id: 'var-core-ent', name: 'Enterprise Multi-Company', extraPrice: 950, brand: 'Enterprise' }
    ]
  },
  {
    id: 'prod-002',
    name: 'Advanced Inventory & Warehouse Barcoding',
    type: 'Software',
    salesPrice: 480,
    costPrice: 160,
    notes: 'Multi-warehouse automation, batch tracking, and serial number management.',
    variants: []
  },
  {
    id: 'prod-003',
    name: 'AI Revenue & Churn Prediction Copilot',
    type: 'Add-on',
    salesPrice: 299,
    costPrice: 90,
    notes: 'Deep learning intelligence for subscription churn warnings and upsell signals.',
    variants: []
  },
  {
    id: 'prod-004',
    name: '24/7 Dedicated Support SLA & TAM',
    type: 'Add-on',
    salesPrice: 450,
    costPrice: 200,
    notes: '15-minute response SLA with a named Technical Account Manager.',
    variants: []
  },
  {
    id: 'prod-005',
    name: 'Automated Tax & GST Compliance Engine',
    type: 'Software',
    salesPrice: 350,
    costPrice: 110,
    notes: 'One-click e-invoicing, automated GST return generation, and multi-state compliance.',
    variants: []
  },
  {
    id: 'prod-006',
    name: 'B2B Customer Self-Service Portal Pro',
    type: 'Add-on',
    salesPrice: 180,
    costPrice: 50,
    notes: 'Allows end-users to manage licenses, invoices, and payment methods.',
    variants: []
  }
];

export const INITIAL_PLANS = [
  {
    id: 'plan-monthly-starter',
    name: 'Monthly Starter',
    billingFrequency: 'monthly', // daily, weekly, monthly, yearly
    cost: 499,
    minQuantity: 1,
    availableFrom: '2026-01-01',
    availableTo: '2026-12-31',
    autoClose: false,
    canCloseEarly: true,
    canPause: true,
    canRenew: true,
    description: 'Perfect for small shops & growing startups requiring agile monthly billing.'
  },
  {
    id: 'plan-yearly-enterprise',
    name: 'Yearly Enterprise Contract',
    billingFrequency: 'yearly',
    cost: 4800,
    minQuantity: 5,
    availableFrom: '2026-01-01',
    availableTo: '2028-12-31',
    autoClose: false,
    canCloseEarly: false, // Strict contract: cannot close early without penalty
    canPause: false, // Strict enterprise SLA: cannot pause mid-term
    canRenew: true,
    description: 'Long-term corporate license with locked enterprise pricing and volume discount.'
  },
  {
    id: 'plan-weekly-growth',
    name: 'Weekly Sprint Flex',
    billingFrequency: 'weekly',
    cost: 140,
    minQuantity: 1,
    availableFrom: '2026-01-01',
    availableTo: '2026-12-31',
    autoClose: false,
    canCloseEarly: true,
    canPause: true,
    canRenew: true,
    description: 'Flexible short-cycle billing for project-based engineering consultancies.'
  },
  {
    id: 'plan-daily-sandbox',
    name: 'Daily Developer Sandbox',
    billingFrequency: 'daily',
    cost: 25,
    minQuantity: 1,
    availableFrom: '2026-01-01',
    availableTo: '2026-12-31',
    autoClose: true, // Automatically closes on expiry
    canCloseEarly: true,
    canPause: false,
    canRenew: false,
    description: 'Ephemeral staging environment plan with automatic decommission.'
  }
];

export const INITIAL_TAX_RULES = [
  {
    id: 'tax-gst-18',
    name: 'GST 18% (Standard Software)',
    rate: 18,
    isDefault: true,
    active: true,
    description: 'Standard Goods & Services Tax for software and cloud services.'
  },
  {
    id: 'tax-vat-5',
    name: 'International VAT 5%',
    rate: 5,
    isDefault: false,
    active: true,
    description: 'Reduced digital export tax for cross-border subscriptions.'
  },
  {
    id: 'tax-zero-0',
    name: 'Zero Rated / SEZ Export 0%',
    rate: 0,
    isDefault: false,
    active: true,
    description: 'Exempted supply for Special Economic Zone clients.'
  }
];

export const INITIAL_DISCOUNTS = [
  {
    id: 'disc-flux20',
    code: 'FLUX20',
    name: 'Odoo x Flux Hackathon 20% Off',
    type: 'percentage', // percentage or fixed
    value: 20,
    minPurchaseAmount: 1000,
    minSeats: 1,
    scope: 'subscription', // subscription or product
    targetProductId: null,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    maxUses: 100,
    currentUses: 14,
    active: true,
    description: 'Special 20% partnership discount for Flux ecosystem members.'
  },
  {
    id: 'disc-multiseat15',
    name: 'Volume Multi-Seat Tier Discount',
    code: 'SEATS15',
    type: 'percentage',
    value: 15,
    minPurchaseAmount: 2500,
    minSeats: 5,
    scope: 'subscription',
    targetProductId: null,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    maxUses: 50,
    currentUses: 28,
    active: true,
    description: '15% savings when subscribing to 5 or more seats.'
  },
  {
    id: 'disc-odoo500',
    code: 'ODOOFREE500',
    name: 'Odoo Suite Migration Credit $500',
    type: 'fixed',
    value: 500,
    minPurchaseAmount: 1500,
    minSeats: 1,
    scope: 'product',
    targetProductId: 'prod-001',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    maxUses: 25,
    currentUses: 22,
    active: true,
    description: '$500 flat concession when upgrading to Brightloop Core Odoo edition.'
  },
  {
    id: 'disc-expired-sample',
    code: 'EXPIRED2025',
    name: 'Legacy 2025 Promotional Pass',
    type: 'percentage',
    value: 30,
    minPurchaseAmount: 500,
    minSeats: 1,
    scope: 'subscription',
    targetProductId: null,
    startDate: '2025-01-01',
    endDate: '2025-12-31', // Already expired!
    maxUses: 10,
    currentUses: 10, // Maxed out!
    active: false,
    description: 'Historical discount rule demonstrating automatic expiration.'
  }
];

export const INITIAL_QUOTATION_TEMPLATES = [
  {
    id: 'tmpl-sme-monthly',
    name: 'Small Shop Monthly Quickstart',
    planId: 'plan-monthly-starter',
    validityDays: 15,
    description: 'Standard package for growing retailers: 1 Core Suite + 1 Add-on.',
    lines: [
      {
        productId: 'prod-001',
        variantId: 'var-core-std',
        quantity: 1,
        taxId: 'tax-gst-18'
      },
      {
        productId: 'prod-006',
        variantId: null,
        quantity: 1,
        taxId: 'tax-gst-18'
      }
    ]
  },
  {
    id: 'tmpl-enterprise-odoo',
    name: 'Enterprise Odoo Power Contract',
    planId: 'plan-yearly-enterprise',
    validityDays: 30,
    description: 'Full-stack enterprise package with +560 Odoo integration variant, AI copilot, and 24/7 SLA.',
    lines: [
      {
        productId: 'prod-001',
        variantId: 'var-core-odoo', // +560 variant
        quantity: 10,
        taxId: 'tax-gst-18'
      },
      {
        productId: 'prod-003', // AI copilot
        variantId: null,
        quantity: 10,
        taxId: 'tax-gst-18'
      },
      {
        productId: 'prod-004', // 24/7 SLA
        variantId: null,
        quantity: 1,
        taxId: 'tax-gst-18'
      }
    ]
  }
];

export const INITIAL_CUSTOMERS = [
  {
    id: 'cust-apex-01',
    name: 'Apex Retail Labs Inc.',
    contactName: 'Elena Rostova',
    email: 'elena@apexretail.io',
    phone: '+1 (555) 349-8812',
    taxId: 'US-EIN-8829104',
    address: '450 Mission St, Suite 1200, San Francisco, CA 94105',
    paymentTerms: 'Net 15',
    portalPassword: 'Password123!' // Matches regex
  },
  {
    id: 'cust-fluxcorp-02',
    name: 'Flux Dynamics GmbH',
    contactName: 'Markus Weber',
    email: 'm.weber@fluxdynamics.de',
    phone: '+49 89 2441-098',
    taxId: 'DE-VAT-99210042',
    address: 'Maximilianstraße 35, 80539 München, Germany',
    paymentTerms: 'Net 30',
    portalPassword: 'Password123!'
  },
  {
    id: 'cust-zenith-03',
    name: 'Zenith Logistics & Supply Ltd',
    contactName: 'Dev Patel',
    email: 'dev@zenithlogistics.in',
    phone: '+91 98201 44521',
    taxId: '27AABCZ9912K1Z8',
    address: 'Bandra-Kurla Complex, Tower 4, Mumbai, MH 400051',
    paymentTerms: 'Immediate',
    portalPassword: 'Password123!'
  },
  {
    id: 'cust-artisan-04',
    name: 'Artisan Coffee Roasters',
    contactName: 'Chloe Bennett',
    email: 'chloe@artisancoffee.co',
    phone: '+1 (555) 782-9901',
    taxId: 'US-EIN-5521990',
    address: '1240 Pearl St, Boulder, CO 80302',
    paymentTerms: 'Immediate',
    portalPassword: 'Password123!'
  }
];

export const INITIAL_STAFF = [
  {
    id: 'staff-admin-01',
    name: 'Sarah Chen (Admin)',
    email: 'admin@brightloop.com',
    role: 'Admin',
    department: 'Executive / IT Management',
    status: 'Active',
    joinedDate: '2025-01-10'
  },
  {
    id: 'staff-ops-02',
    name: 'Julian Vance',
    email: 'staff@brightloop.com',
    role: 'Internal Staff',
    department: 'Sales & Customer Operations',
    status: 'Active',
    joinedDate: '2025-03-15'
  },
  {
    id: 'staff-billing-03',
    name: 'Aisha Al-Mansoor',
    email: 'aisha@brightloop.com',
    role: 'Internal Staff',
    department: 'Finance & Billing Accounts',
    status: 'Active',
    joinedDate: '2025-06-01'
  }
];

export const INITIAL_SUBSCRIPTIONS = [
  {
    id: 'sub-2026-0001',
    subNumber: 'SUB-2026-0001',
    customerId: 'cust-apex-01',
    planId: 'plan-monthly-starter',
    // 5-Stage Status: Draft -> Quotation -> Confirmed -> Active -> Closed
    status: 'Active',
    startDate: '2026-09-01',
    expiryDate: '2027-09-01',
    nextBillingDate: '2026-10-01', // Due for billing day!
    paymentTerms: 'Net 15',
    discountId: 'disc-flux20',
    lines: [
      {
        id: 'sub-line-1-1',
        productId: 'prod-001',
        variantId: 'var-core-std',
        variantName: 'Standard Edition',
        quantity: 2,
        basePrice: 1200,
        variantExtra: 0,
        unitPrice: 1200,
        taxId: 'tax-gst-18',
        taxRate: 18,
        total: 2400
      },
      {
        id: 'sub-line-1-2',
        productId: 'prod-003',
        variantId: null,
        variantName: null,
        quantity: 2,
        basePrice: 299,
        variantExtra: 0,
        unitPrice: 299,
        taxId: 'tax-gst-18',
        taxRate: 18,
        total: 598
      }
    ],
    notes: 'Retail pilot expanding to 10 branches next quarter.'
  },
  {
    id: 'sub-2026-0002',
    subNumber: 'SUB-2026-0002',
    customerId: 'cust-fluxcorp-02',
    planId: 'plan-yearly-enterprise',
    status: 'Active',
    startDate: '2026-01-15',
    expiryDate: '2027-01-15',
    nextBillingDate: '2026-10-15', // Due for billing!
    paymentTerms: 'Net 30',
    discountId: 'disc-multiseat15',
    lines: [
      {
        id: 'sub-line-2-1',
        productId: 'prod-001',
        variantId: 'var-core-odoo', // +560 Odoo brand variant!
        variantName: 'Odoo Connected Edition (+560)',
        quantity: 8,
        basePrice: 1200,
        variantExtra: 560,
        unitPrice: 1760, // 1200 + 560
        taxId: 'tax-vat-5',
        taxRate: 5,
        total: 14080
      },
      {
        id: 'sub-line-2-2',
        productId: 'prod-004',
        variantId: null,
        variantName: null,
        quantity: 1,
        basePrice: 450,
        variantExtra: 0,
        unitPrice: 450,
        taxId: 'tax-vat-5',
        taxRate: 5,
        total: 450
      }
    ],
    notes: 'Full Odoo x Flux Hackathon enterprise deployment with guaranteed 15m SLA.'
  },
  {
    id: 'sub-2026-0003',
    subNumber: 'SUB-2026-0003',
    customerId: 'cust-zenith-03',
    planId: 'plan-monthly-starter',
    status: 'Quotation',
    startDate: '2026-10-25',
    expiryDate: '2027-10-25',
    nextBillingDate: '2026-11-25',
    paymentTerms: 'Immediate',
    discountId: null,
    lines: [
      {
        id: 'sub-line-3-1',
        productId: 'prod-002',
        variantId: null,
        variantName: null,
        quantity: 5,
        basePrice: 480,
        variantExtra: 0,
        unitPrice: 480,
        taxId: 'tax-gst-18',
        taxRate: 18,
        total: 2400
      }
    ],
    notes: 'Quotation awaiting Dev Patel sign-off.'
  },
  {
    id: 'sub-2026-0004',
    subNumber: 'SUB-2026-0004',
    customerId: 'cust-artisan-04',
    planId: 'plan-monthly-starter',
    status: 'Active',
    startDate: '2026-08-10',
    expiryDate: '2027-08-10',
    nextBillingDate: '2026-10-10',
    paymentTerms: 'Immediate',
    discountId: null,
    lines: [
      {
        id: 'sub-line-4-1',
        productId: 'prod-001',
        variantId: 'var-core-std',
        variantName: 'Standard Edition',
        quantity: 1,
        basePrice: 1200,
        variantExtra: 0,
        unitPrice: 1200,
        taxId: 'tax-gst-18',
        taxRate: 18,
        total: 1200
      }
    ],
    notes: 'Small local cafe chain.'
  },
  {
    id: 'sub-2026-0005',
    subNumber: 'SUB-2026-0005',
    customerId: 'cust-zenith-03',
    planId: 'plan-daily-sandbox',
    status: 'Closed',
    startDate: '2026-09-01',
    expiryDate: '2026-09-15',
    nextBillingDate: '2026-09-15',
    paymentTerms: 'Immediate',
    discountId: null,
    lines: [
      {
        id: 'sub-line-5-1',
        productId: 'prod-005',
        variantId: null,
        variantName: null,
        quantity: 1,
        basePrice: 25,
        variantExtra: 0,
        unitPrice: 25,
        taxId: 'tax-gst-18',
        taxRate: 18,
        total: 25
      }
    ],
    notes: 'Temporary sandbox completed and decommissioned.'
  }
];

export const INITIAL_INVOICES = [
  {
    id: 'inv-2026-0001',
    invoiceNumber: 'INV-2026-0001',
    subscriptionId: 'sub-2026-0001',
    customerId: 'cust-apex-01',
    invoiceDate: '2026-09-01',
    dueDate: '2026-09-16', // Net 15 -> Overdue! Past September 16, 2026
    billingCycleDate: '2026-09-01',
    idempotencyKey: 'sub-2026-0001_2026-09-01',
    status: 'Confirmed', // Unpaid and past due date => OVERDUE
    paymentTerms: 'Net 15',
    subtotal: 2998.00,
    discountAmount: 599.60, // 20% FLUX20
    discountCode: 'FLUX20',
    taxAmount: 431.71, // 18% of discounted
    totalAmount: 2830.11,
    paidAmount: 0,
    remainingAmount: 2830.11,
    lines: [
      {
        description: 'Brightloop ERP Core Suite (Standard Edition)',
        quantity: 2,
        unitPrice: 1200,
        taxRate: 18,
        total: 2400
      },
      {
        description: 'AI Revenue & Churn Prediction Copilot',
        quantity: 2,
        unitPrice: 299,
        taxRate: 18,
        total: 598
      }
    ],
    emailSent: true,
    notes: 'First cycle invoice for Apex Retail Labs.'
  },
  {
    id: 'inv-2026-0002',
    invoiceNumber: 'INV-2026-0002',
    subscriptionId: 'sub-2026-0002',
    customerId: 'cust-fluxcorp-02',
    invoiceDate: '2026-01-15',
    dueDate: '2026-02-15',
    billingCycleDate: '2026-01-15',
    idempotencyKey: 'sub-2026-0002_2026-01-15',
    status: 'Paid',
    paymentTerms: 'Net 30',
    subtotal: 14530.00,
    discountAmount: 2179.50, // 15% SEATS15
    discountCode: 'SEATS15',
    taxAmount: 617.53, // 5% VAT
    totalAmount: 12968.03,
    paidAmount: 12968.03,
    remainingAmount: 0,
    lines: [
      {
        description: 'Brightloop ERP Core Suite (Odoo Connected Edition +560)',
        quantity: 8,
        unitPrice: 1760,
        taxRate: 5,
        total: 14080
      },
      {
        description: '24/7 Dedicated Support SLA & TAM',
        quantity: 1,
        unitPrice: 450,
        taxRate: 5,
        total: 450
      }
    ],
    emailSent: true,
    notes: 'Enterprise annual contract payment settled via Wire Transfer.'
  },
  {
    id: 'inv-2026-0003',
    invoiceNumber: 'INV-2026-0003',
    subscriptionId: 'sub-2026-0004',
    customerId: 'cust-artisan-04',
    invoiceDate: '2026-08-10',
    dueDate: '2026-08-10', // Immediate -> Overdue!
    billingCycleDate: '2026-08-10',
    idempotencyKey: 'sub-2026-0004_2026-08-10',
    status: 'Confirmed', // Unpaid -> Overdue
    paymentTerms: 'Immediate',
    subtotal: 1200.00,
    discountAmount: 0,
    discountCode: null,
    taxAmount: 216.00, // 18% GST
    totalAmount: 1416.00,
    paidAmount: 500.00, // Partial payment
    remainingAmount: 916.00,
    lines: [
      {
        description: 'Brightloop ERP Core Suite (Standard Edition)',
        quantity: 1,
        unitPrice: 1200,
        taxRate: 18,
        total: 1200
      }
    ],
    emailSent: true,
    notes: 'Partial payment received; remaining $916 overdue.'
  }
];

export const INITIAL_PAYMENTS = [
  {
    id: 'pay-2026-0001',
    paymentNumber: 'PAY-2026-0001',
    invoiceId: 'inv-2026-0002',
    customerId: 'cust-fluxcorp-02',
    amount: 12968.03,
    paymentDate: '2026-01-20',
    method: 'Bank Transfer', // Bank Transfer, UPI, Card, Cash
    reference: 'SWIFT-DE-88391032',
    notes: 'Paid in full via international SWIFT transfer.'
  },
  {
    id: 'pay-2026-0002',
    paymentNumber: 'PAY-2026-0002',
    invoiceId: 'inv-2026-0003',
    customerId: 'cust-artisan-04',
    amount: 500.00,
    paymentDate: '2026-08-15',
    method: 'Card',
    reference: 'STRIPE-CH-774921',
    notes: 'Installment 1 of 2.'
  }
];
