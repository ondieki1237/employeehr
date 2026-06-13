# Multi-Tenant ERP Integration Architecture Documentation

## Project Overview

### Objective

Build a centralized procurement platform that allows healthcare facilities to submit product requests through a website while all procurement, supplier management, quotations, orders, and logistics are managed inside a Multi-Tenant ERP system.

The website acts as the customer-facing portal while the ERP acts as the operational backend.

---

# Business Flow

## Current Business Process

```text
Healthcare Facility
        ↓
Submit RFQ
        ↓
Website Portal
        ↓
ERP System
        ↓
Supplier Database
        ↓
Quotation Collection
        ↓
Order Processing
        ↓
Shipping & Delivery
```

---

# System Components

## 1. Frontend Website

### Purpose

Public-facing platform where buyers:

* Browse products
* Request quotations
* Submit procurement requests
* Track orders
* View quotations
* Manage procurement history

### Functions

#### Product Catalog

Display:

* Medical equipment
* Laboratory equipment
* Hospital furniture
* Consumables
* Theatre equipment
* Diagnostic devices

#### RFQ Submission

Users submit:

```json
{
  "product_name": "Patient Monitor",
  "quantity": 5,
  "required_date": "2026-07-01",
  "delivery_location": "Nairobi",
  "additional_notes": "Need warranty"
}
```

#### Customer Dashboard

Allow users to:

* View RFQs
* View quotations
* Approve quotations
* View orders
* Track shipments

---

# 2. API Gateway Layer

## Purpose

Acts as a bridge between:

```text
Frontend Website
       ↓
API Gateway
       ↓
ERP System
```

Benefits:

* Security
* Validation
* Authentication
* Tenant Identification
* Rate Limiting
* Logging

The website should never connect directly to ERP databases.

---

# 3. Multi-Tenant ERP System

## Purpose

Main operational engine.

Every company operates inside its own tenant environment.

Example:

```text
Tenant 1: Accord Medical
Tenant 2: MedWish Kenya
Tenant 3: Hospital Procurement Network
```

Each tenant has:

* Users
* RFQs
* Suppliers
* Orders
* Products
* Reports

isolated from other tenants.

---

# Multi-Tenant Design

## Tenant Table

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    slug VARCHAR(100),
    api_key TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP
);
```

Example:

```text
1 | Accord Medical | accord-medical
2 | MedWish Kenya | medwish
3 | Health Supply Network | hsn
```

---

# Authentication Architecture

## User Authentication

Login endpoint:

```http
POST /api/auth/login
```

Response:

```json
{
  "token": "jwt_token"
}
```

JWT Payload:

```json
{
  "user_id": 45,
  "tenant_id": "tenant_001",
  "role": "buyer"
}
```

---

# Core ERP Modules

---

## Module 1: Tenant Management

### Functions

Create Tenant

```http
POST /api/tenants
```

Update Tenant

```http
PUT /api/tenants/{id}
```

Suspend Tenant

```http
PATCH /api/tenants/{id}/suspend
```

Delete Tenant

```http
DELETE /api/tenants/{id}
```

---

## Module 2: User Management

### Roles

#### Super Admin

Can:

* Create tenants
* Manage subscriptions
* Access all tenants

#### Tenant Admin

Can:

* Manage users
* Manage suppliers
* Approve quotations

#### Procurement Officer

Can:

* Create RFQs
* Compare quotations
* Create orders

#### Supplier

Can:

* Submit quotations
* Update order status

#### Buyer

Can:

* Submit requests
* Approve quotations

---

## Module 3: RFQ Management

### Purpose

Manage procurement requests.

RFQ Workflow:

```text
Draft
 ↓
Submitted
 ↓
Supplier Sourcing
 ↓
Quotation Collection
 ↓
Quotation Comparison
 ↓
Buyer Approval
 ↓
Purchase Order Creation
```

### RFQ Fields

```json
{
  "rfq_id": "RFQ001",
  "tenant_id": "tenant001",
  "buyer_id": "user001",
  "items": [],
  "status": "submitted"
}
```

---

## Module 4: Supplier Management

### Supplier Information

```json
{
  "supplier_name": "Shenzhen Medical Equipment Ltd",
  "country": "China",
  "email": "sales@supplier.com",
  "phone": "+86xxxxxx",
  "categories": [
    "Monitors",
    "Ultrasound"
  ]
}
```

Functions:

* Supplier onboarding
* Supplier approval
* Supplier rating
* Supplier performance tracking

---

## Module 5: Quotation Management

Suppliers submit quotations.

Quotation Fields:

```json
{
  "rfq_id": "RFQ001",
  "supplier_id": "SUP001",
  "unit_price": 500,
  "quantity": 10,
  "lead_time": 21
}
```

Functions:

* Compare quotations
* Rank quotations
* Approve quotations
* Reject quotations

---

## Module 6: Purchase Orders

### Workflow

```text
Approved Quote
       ↓
Generate PO
       ↓
Send To Supplier
       ↓
Supplier Confirmation
       ↓
Fulfillment
```

PO Example:

```json
{
  "po_number": "PO-2026-001",
  "supplier": "Supplier A",
  "amount": 5000
}
```

---

## Module 7: Product Management

### Product Categories

* Medical Equipment
* Theatre Equipment
* ICU Equipment
* Diagnostic Equipment
* Laboratory Equipment
* Hospital Furniture
* Consumables

Product Data:

```json
{
  "sku": "PM001",
  "name": "Patient Monitor",
  "category": "ICU Equipment"
}
```

---

## Module 8: Order Management

Order Statuses

```text
Pending
Confirmed
Production
Ready For Shipment
Shipped
Delivered
Completed
```

Functions:

* Order tracking
* Milestone updates
* Shipment monitoring

---

## Module 9: Shipping & Logistics

Manage:

* Freight Forwarders
* Air Freight
* Sea Freight
* Courier Services

Shipping Record:

```json
{
  "tracking_number": "TRK001",
  "carrier": "DHL",
  "status": "In Transit"
}
```

---

## Module 10: Document Management

Store:

* RFQs
* Quotations
* Purchase Orders
* Invoices
* Delivery Notes
* Import Documents
* Compliance Certificates

Supported Formats:

* PDF
* DOCX
* XLSX
* Images

---

## Module 11: Notifications

Events:

* RFQ Submitted
* RFQ Approved
* New Quotation
* Purchase Order Created
* Shipment Updated
* Delivery Confirmed

Channels:

* Email
* SMS
* WhatsApp
* In-App Notifications

---

## Module 12: Analytics & Reports

Reports:

### Procurement Reports

* RFQs per month
* Procurement value
* Approval rate

### Supplier Reports

* Supplier performance
* Supplier response time

### Sales Reports

* Revenue
* Gross profit
* Top products

---

# API Architecture

## Tenant-Aware API Design

Every request must include tenant context.

### Option 1

```http
POST /api/v1/tenants/{tenantId}/rfqs
```

### Option 2

Headers

```http
X-Tenant-ID: tenant001
Authorization: Bearer token
```

Recommended approach:

Use both JWT and Tenant Header validation.

---

# Database Structure

Core Tables

```text
tenants
users
roles
permissions
products
categories
rfqs
rfq_items
suppliers
quotations
quotation_items
purchase_orders
purchase_order_items
shipments
documents
notifications
audit_logs
```

---

# Security Requirements

Implement:

* JWT Authentication
* Role-Based Access Control
* API Rate Limiting
* Audit Logs
* Multi-Factor Authentication
* Tenant Isolation

Every database query must filter by:

```sql
WHERE tenant_id = ?
```

to prevent data leakage.

---

# Recommended Technology Stack

## ERP Backend

* Node.js
* NestJS
* PostgreSQL

## API Layer

* NestJS
* Express

## Authentication

* JWT
* Refresh Tokens

## Database

* PostgreSQL

## Storage

* AWS S3
* Cloudflare R2

## Queue Processing

* Redis
* BullMQ

## Search

* Elasticsearch

## Monitoring

* Grafana
* Prometheus

---

# Future Expansion

Phase 2

* Inventory Management
* Warehouse Management
* Supplier Portal
* E-Procurement Marketplace
* AI Supplier Matching
* Automated Quotation Analysis

Phase 3

* ERP Mobile App
* Customer Mobile App
* Vendor Mobile App
* Predictive Procurement Analytics
* Automated Purchase Recommendations

---

# Final Architecture

```text
Customer Website
        ↓
Frontend (Next.js)
        ↓
API Gateway
        ↓
Authentication Service
        ↓
Multi-Tenant ERP Core
        ↓
RFQ Module
Quotation Module
Supplier Module
PO Module
Logistics Module
Analytics Module
        ↓
PostgreSQL Database
        ↓
Cloud Storage
```

This architecture allows unlimited healthcare organizations, hospitals, NGOs, distributors, and procurement companies to operate independently within the same ERP platform while sharing a single codebase and infrastructure.
