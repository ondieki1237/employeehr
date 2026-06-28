# DETAILED ACTION PLAN - NEXT IMPLEMENTATION STEPS

## Status Checklist

### ✅ COMPLETED TASKS
- [x] Comprehensive project study
- [x] Architecture understanding
- [x] Database models mapping
- [x] API endpoints documented
- [x] Issues identified
- [x] File structure mapped

### 🔄 IN PROGRESS TASKS
- [ ] Fix runtime errors
- [ ] Employee quotations improvements
- [ ] Warehouse Management System completion
- [ ] Installed Machines feature completion
- [ ] Email & branding enhancements

---

## IMPLEMENTATION ROADMAP

### PRIORITY 1: Fix Runtime Errors (Blocking)

#### Error 1.1: Dynamic Import Promise Issue
**File**: `/components/admin/stock/stock-manager-content.tsx`
**Line**: 2731
**Issue**: Lazy loading returns promise instead of component

**Current Code**:
```tsx
const WarehouseManagement = dynamic(
  () => import("./warehouse-management").then((mod) => mod.WarehouseManagement),
  { ssr: false },
);
```

**Fix**:
```tsx
const WarehouseManagement = dynamic(
  () => import("./warehouse-management").then((mod) => mod.WarehouseManagement),
  { 
    ssr: false,
    loading: () => <div>Loading warehouse...</div>
  },
);
```

OR simpler:
```tsx
import dynamic from 'next/dynamic';
const WarehouseManagement = dynamic(
  () => import("./warehouse-management").then(mod => mod.WarehouseManagement),
  { ssr: false }
);
```

**Verification**: Test at `/admin/stock/wms`

---

#### Error 1.2: Select Item Empty Value
**File**: `/components/admin/stock/warehouse-management.tsx`
**Line**: 429
**Issue**: Radix UI Select.Item requires non-empty value

**Fix Approach**:
1. Find line 429 in warehouse-management.tsx
2. Ensure all Select.Item elements have value prop
3. Use key or index if needed, never empty string

**Example**:
```tsx
{categories.map((cat, idx) => (
  <Select.Item key={cat} value={cat || `category-${idx}`}>
    {cat || 'Uncategorized'}
  </Select.Item>
))}
```

---

#### Error 1.3: InstalledMachineController Syntax
**File**: `/server/src/controllers/installedMachineController.ts`
**Status**: File appears syntactically correct
**Action**: Clear build cache
```bash
rm -rf /home/seth/Documents/code/employeehr/server/dist
rm -rf /home/seth/Documents/code/employeehr/.next
npm run build
```

---

### PRIORITY 2: Employee Quotations Module

#### Task 2.1: Hide Phone Number in Client Search
**File**: `/app/employee/stock/quotations/page.tsx`
**Lines**: 407-416 (filteredClients calculation)

**Current Logic**:
```tsx
const filteredClients = useMemo(() => {
  const query = existingClientSearch.toLowerCase();
  if (!query) return clients.slice(0, 5);
  return clients.filter(c =>
    c.name?.toLowerCase().includes(query) ||
    c.location?.toLowerCase().includes(query)
  ).slice(0, 10);
}, [existingClientSearch, clients]);
```

**Display Changes** (in client list UI):
- Show: `{client.name} - {client.location}`
- Hide: `client.phone` (if displayed)

**Files to Modify**:
1. Quotation display (where clients shown in dropdown)
2. Selected client display
3. Create quotation form

**Test Path**: `/employee/stock/quotations` → Search for client → Verify phone not visible

---

#### Task 2.2: Collapse Create Quotation Section
**File**: `/app/employee/stock/quotations/page.tsx`
**Lines**: Entire create form UI (~1000+ lines)

**Approach**:
1. Add state: `const [showCreateForm, setShowCreateForm] = useState(false);`
2. Wrap entire create form in conditional:
```tsx
{showCreateForm && (
  <div className="...create form...">
    {/* entire form */}
  </div>
)}
```
3. Add button to toggle:
```tsx
<button onClick={() => setShowCreateForm(!showCreateForm)}>
  {showCreateForm ? 'Hide' : 'Create Quotation'}
</button>
```

**Default State**: Collapsed (showCreateForm = false)

---

#### Task 2.3: Download Control Based on Status
**File**: `/app/employee/stock/quotations/page.tsx`
**Lines**: Search for downloadQuotationPdf, canDownloadQuotation

**Current canDownloadQuotation**:
```tsx
const canDownloadQuotation = (quotation: Quotation) => {
  return quotation.status === "approved"; // or check if pending
};
```

**Implementation**:
1. Check quotation.status
2. Only allow download if status === "approved"
3. Hide/disable download button otherwise
4. Show message: "Quotation must be approved before download"

**Status Values**: "draft" | "pending" | "approved" | "converted"
- Draft: ❌ Not downloadable, editable
- Pending: ❌ Not downloadable, editable
- Approved: ✅ Downloadable, not editable
- Converted: ✅ Downloadable, not editable

---

#### Task 2.4: Edit & Modify Before Approval
**File**: `/app/employee/stock/quotations/page.tsx`
**Key Functions**: startEditQuotation, addItemFromSuggestion, removeDraftItem

**Requirements**:
1. Status not "approved" or "converted" → Allow edit
2. Status "approved" or "converted" → Disable edit
3. Add products: Only if not approved
4. Remove products: Only if not approved

**Implementation Locations**:
- Edit button visibility (line ~800+)
- Save button visibility
- Form input disabling based on status
- Remove item button visibility

---

#### Task 2.5: Invoice Page Redesign
**File**: `/app/employee/stock/invoices/page.tsx`
**Reference**: `/app/admin/stock/invoices/page.tsx`

**Goals**:
1. Match admin invoice design layout
2. Same status indicators
3. Same information display
4. Same action buttons
5. Same PDF generation (but with employee-only data)

**Key Sections**:
- Invoice list with pagination
- Search and filtering
- Status badges
- Amount summaries
- Download/Print buttons
- View details modal/page

---

### PRIORITY 3: Warehouse Management System (WMS)

#### Task 3.1: Fix Save Persistence Issue
**File**: `/app/admin/stock/wms/page.tsx`
**Backend**: `/server/src/controllers/warehouseController.ts`

**Investigation Steps**:
1. Check if save button sends correct data
2. Verify API endpoint receives data
3. Check database write succeeds
4. Verify query retrieves saved data

**Common Issues**:
- Data not stringified correctly
- Missing org_id in save
- Wrong endpoint path
- Database permission issues

**Fix Checklist**:
```
1. Client: verify JSON.stringify on canvas objects
2. Client: check Authorization header present
3. Backend: verify org_id captured from req.user
4. Backend: verify save to MongoDB succeeds
5. Backend: verify retrieve query filters by org_id
6. Backend: test with Postman/insomnia
```

---

#### Task 3.2: Fix Select Component Empty Value
**File**: `/components/admin/stock/warehouse-management.tsx`
**Issue**: Select items with empty string value

**Solution**:
1. Find all `<Select.Item value="">` instances
2. Replace with meaningful values:
   - Use category name
   - Use index: `value={String(index)}`
   - Use conditional value: `value={category || 'uncategorized'}`

**Test**: Load warehouse page, no select errors should appear

---

#### Task 3.3: Grid-Based Warehouse Design
**Current Approach**: X/Y coordinates
**New Approach**: Grid cells (simpler)

**Implementation**:
```tsx
// Grid system (instead of pixels)
warehouse.layout = {
  gridWidth: 10,      // 10 columns
  gridHeight: 10,     // 10 rows
  gridSize: 50,       // Each cell = 50px
  objects: [
    {
      id: "zone-1",
      type: "zone",
      label: "Zone A",
      gridX: 2,         // Column
      gridY: 2,         // Row
      gridWidth: 3,     // 3 cells wide
      gridHeight: 4,    // 4 cells high
    }
  ]
}
```

**Benefits**:
- Easier to understand
- Simple naming (Zone A, Aisle 01, etc.)
- No coordinate math errors
- Easier to place products

---

#### Task 3.4: Workflow Redesign
**Current Flow Issue**: User asked to select layout before creating one

**Correct Flow**:
```
1. Select Warehouse
   ↓
2. Create/Edit Layout (if not exists)
   - Design walls, doors, zones
   - Save layout
   ↓
3. Create Storage Hierarchy
   - Add aisles to zones
   - Add shelves to aisles
   - Add bins to shelves
   ↓
4. Assign Products
   - Select zone/aisle/shelf/bin
   - Search product
   - Enter quantity
   - Save location
```

**UI Structure**:
```tsx
// Tab 1: Warehouse Selection
<Tab label="Warehouse">
  <WarehouseSelector />
</Tab>

// Tab 2: Layout Design (only if warehouse selected)
{selectedWarehouse && (
  <Tab label="Design Layout">
    <WarehouseCanvas />
  </Tab>
)}

// Tab 3: Hierarchy (only if layout saved)
{layoutSaved && (
  <Tab label="Storage Hierarchy">
    <HierarchyBuilder />
  </Tab>
)}

// Tab 4: Product Assignment
{hierarchySaved && (
  <Tab label="Assign Products">
    <ProductAssignment />
  </Tab>
)}
```

---

#### Task 3.5: UI Compaction (Collapsible Sections)
**Goal**: Reduce scrolling, improve usability

**Sections to Collapse**:
1. Create Warehouse → Accordion/Modal
2. Warehouse Settings → Accordion
3. Layout Designer → Main focus area
4. Import Layout → Modal
5. Hierarchy Builder → Accordion (when open)
6. Product Assignment → Accordion (when open)

**Implementation Pattern**:
```tsx
<Accordion>
  <AccordionItem value="create-warehouse">
    <AccordionTrigger>+ Create Warehouse</AccordionTrigger>
    <AccordionContent>
      {/* Form */}
    </AccordionContent>
  </AccordionItem>
  
  <AccordionItem value="layout">
    <AccordionTrigger>Design Layout</AccordionTrigger>
    <AccordionContent>
      <WarehouseCanvas />
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

#### Task 3.6: Product Location Display
**Goal**: Find product → Show location + quantity

**Display Format**:
```
Product: Ultrasound Gel
Warehouse: Main Warehouse
Zone: Storage A
Aisle: A03
Shelf: B
Bin: 04
Quantity: 45 units
```

**Implementation**:
1. Search product endpoint:
   ```
   GET /api/stock/products/search?q=ultrasound
   Returns: { product, warehouseLocation: { ... } }
   ```

2. Location object structure:
   ```typescript
   {
     warehouseId: ObjectId,
     warehouseName: String,
     zone: String,
     aisle: String,
     shelf: String,
     bin: String,
     quantity: Number,
     lastUpdated: Date
   }
   ```

3. Frontend display component
4. Highlight location on warehouse map

---

### PRIORITY 4: Installed Machines Completion

#### Task 4.1: Fix Machine Selection/Clickability
**File**: `/app/admin/clients/installed-machines/page.tsx`
**Issue**: Machines in candidate list not clickable/selectable

**Current State**:
- Show candidates from invoices
- Display in collapsible section
- User should select machines to add

**Fix Needed**:
1. Make each machine row clickable
2. Add checkbox or click-to-select
3. Show selected count
4. Enable "Save Selected" button

**UI Pattern**:
```tsx
{candidates.map(machine => (
  <div 
    key={machine.invoiceId}
    onClick={() => selectMachine(machine)}
    className={isSelected ? 'bg-blue-50' : ''}
  >
    <input 
      type="checkbox" 
      checked={isSelected}
      onChange={() => toggleSelect(machine)}
    />
    <span>{machine.productName}</span>
    <span>{machine.client.name}</span>
  </div>
))}
```

---

#### Task 4.2: Auto-Add on Invoice Creation
**File**: Backend flow when invoice created

**Implementation**:
1. When invoice created/marked delivered:
   - Extract "machine" type products
   - Auto-create InstalledMachine records
   - Set status: "pending_installation_details"
   - Add to employee list

2. Add new status value:
   ```typescript
   status: "pending_installation_details" | "Active" | "Maintenance" | "Ended"
   ```

3. Show these with warning: "⚠️ Missing installation details"

4. Allow user to click → Edit → Fill details → Save

---

#### Task 4.3: Edit Form Data Fetching
**File**: `/app/admin/clients/installed-machines/page.tsx`
**Issue**: Form not loading existing data on edit

**Fix**:
1. On edit click:
   ```tsx
   const handleEdit = async (machineId: string) => {
     const res = await fetch(
       `/api/installed-machines/${machineId}`,
       { headers: getAuthHeaders() }
     );
     const { data } = await res.json();
     setEditingMachine(data);  // Populate form
     setShowEditDialog(true);
   }
   ```

2. Populate form fields:
   - serialNumber
   - installationLocation
   - installationDepartment
   - installationDate
   - nextServiceDate
   - installedBy
   - attendant
   - attendantNumber
   - isTrained

---

#### Task 4.4: Operator Number Field Display
**File**: `/app/admin/clients/installed-machines/page.tsx`
**Current**: Has attendantNumber in model
**Issue**: Field not displayed in form

**Add to Form**:
```tsx
<input 
  type="text"
  label="Operator Number"
  value={editingMachine.attendantNumber}
  onChange={(e) => setEditingMachine({
    ...editingMachine,
    attendantNumber: e.target.value
  })}
  placeholder="Phone/ID number"
/>
```

---

#### Task 4.5: List Display Enhancement
**File**: Installed machines table
**Current**: Basic list
**Enhance**:
1. Search bar at top
2. Filter by status
3. Sort by date
4. Show:
   - Machine name
   - Client name
   - Serial number
   - Installation date
   - Next service date
   - Status badge
   - Actions (Edit, Delete, View service history)

---

### PRIORITY 5: Email & Branding

#### Task 5.1: Logo Usage in Emails
**Files**: Email templates in `/server/src/templates` or similar

**Changes**:
1. Use `/public/logo.png` or `/uploads/logos/main-logo.png`
2. Base64 encode for email embedding
3. Proper sizing (not stretched)
4. Centered in email header

**Implementation**:
```html
<img src="cid:logo" alt="Company Logo" style="width: 150px; height: auto;">
```

**Attachment**:
```typescript
attachments: [{
  filename: 'logo.png',
  path: path.join(process.cwd(), 'public/logo.png'),
  cid: 'logo'
}]
```

---

#### Task 5.2: Email Template Improvements
**Style with**:
- Existing brand colors only
- Professional fonts
- Proper spacing
- Centered layout
- Mobile-responsive

**Sections**:
- Header with logo
- Content area
- Footer with company info
- CTA button (if needed)

---

## IMPLEMENTATION SEQUENCE

### Week 1
1. Fix runtime errors (1-2 days)
2. Employee quotations (collapse + download control) (2 days)
3. Employee invoice redesign (2 days)

### Week 2
1. Warehouse save persistence (1 day)
2. Select component fix (0.5 day)
3. Grid-based design + workflow (3 days)
4. UI compaction (1 day)

### Week 3
1. Product location display (2 days)
2. Installed machines - fix selection (1 day)
3. Installed machines - edit form (1 day)
4. Auto-add machines (1 day)

### Week 4
1. Email & branding (1 day)
2. Testing & bug fixes (3 days)
3. Deployment prep (1 day)

---

## TESTING CHECKLIST

### Employee Quotations
- [ ] Search shows only name + location
- [ ] Create quotation section collapsed by default
- [ ] Click to expand/collapse works
- [ ] Requested quotation not downloadable
- [ ] Approved quotation downloadable
- [ ] Can edit before approval
- [ ] Cannot edit after approval
- [ ] Can add products before approval
- [ ] Cannot add products after approval

### Warehouse Management
- [ ] Save layout persists on reload
- [ ] Select items don't error
- [ ] Workflow follows correct steps
- [ ] Collapsible sections work
- [ ] Product search shows location
- [ ] Location displays with quantity

### Installed Machines
- [ ] Machine selection works
- [ ] Edit form loads existing data
- [ ] All fields display (including operator #)
- [ ] Save updates correctly
- [ ] Auto-add triggers on invoice
- [ ] Delete works with confirmation

### Email
- [ ] Logo displays correctly
- [ ] Email layout is responsive
- [ ] Brand colors used
- [ ] All text readable

---

## SUCCESS CRITERIA

✅ All runtime errors resolved
✅ Employee quotations fully functional
✅ Warehouse designs save and load correctly
✅ Installed machines feature complete
✅ Email branding improved
✅ All new features tested
✅ No console errors
✅ Mobile responsive (where applicable)

---

## NOTES FOR NEXT AGENT

- Project is well-structured, clean architecture
- Multi-tenant (org_id filtering critical)
- Auth via JWT in Authorization header
- Use existing components/patterns
- Test at each step
- Keep code DRY
- Document any new API changes
