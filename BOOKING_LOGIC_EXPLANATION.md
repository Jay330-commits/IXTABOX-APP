# Booking & Availability Logic Explanation

## Overview
The system determines if locations/boxes are available or booked, and calculates when they'll be available again.

---

## 1. Database Structure

### Relationships:
```
Location (1) ──→ (Many) Stands
Stand (1) ──→ (Many) Boxes
Box (1) ──→ (Many) Bookings
```

### Key Fields:
- **Boxes**: `status` (Active/Inactive), `model` (Classic/Pro)
- **Bookings**: `start_date`, `end_date`, `status` (Active/Pending/Completed)

---

## 2. API: `/api/locations` - Location List Logic

### Step-by-Step Process:

#### Step 1: Fetch Data
```typescript
// Fetches all locations with:
- Stands
- Boxes (only Active boxes)
- Bookings (only Active/Pending bookings)
```

#### Step 2: Count Boxes by Model
For each location, iterate through all stands and boxes:

```typescript
For each box:
  - If box.status === Active:
    - totalBoxes++
    - If box has bookings:
      - bookedBoxes++
      - Collect booking end dates (by model: Classic/Pro)
    - Else (no bookings):
      - classicCount++ OR proCount++ (depending on model)
```

#### Step 3: Determine Location Status
```typescript
isFullyBooked = (totalBoxes > 0) && (bookedBoxes === totalBoxes)
```

**Logic:**
- Location is fully booked if ALL boxes have active/pending bookings
- If even 1 box has no bookings → location is NOT fully booked

#### Step 4: Calculate Next Available Dates
```typescript
// For each model (Classic/Pro):
- Collect all booking end dates for that model
- Find the LATEST end date (most recent booking end)
- That becomes the "next available date" for that model

// For entire location:
- Collect ALL booking end dates (all models)
- Find the LATEST end date
- That becomes the "earliest next available date" for the location
```

**Example:**
- Classic boxes booked until: Dec 10, Dec 15, Dec 20
- Latest = Dec 20 → Classic next available: Dec 21
- Pro boxes booked until: Dec 12, Dec 18
- Latest = Dec 18 → Pro next available: Dec 19
- Location earliest next available: Dec 21 (latest of all)

#### Step 5: Check Model-Level Booking
```typescript
isClassicFullyBooked = (classicTotal > 0) && (classicCount === 0)
isProFullyBooked = (proTotal > 0) && (proCount === 0)
```

**Logic:**
- A model is fully booked if:
  - There are boxes of that model (classicTotal > 0)
  - AND none of them are available (classicCount === 0)

---

## 3. API: `/api/locations/[id]/boxes` - Box Availability Logic

### Purpose:
When user selects a model and dates, check which specific boxes are available.

### Step-by-Step Process:

#### Step 1: Fetch Location with Bookings
```typescript
// Gets location with:
- All stands
- All boxes (Active only)
- All bookings (Active/Pending only) for each box
```

#### Step 2: Filter by Model
```typescript
// Only include boxes matching selected model (Classic or Pro)
```

#### Step 3: Check Date Conflicts
For each box, check if requested dates conflict with existing bookings:

```typescript
function hasDateOverlap(start1, end1, start2, end2):
  return (start1 <= end2) && (end1 >= start2)
```

**Example:**
- Existing booking: Dec 10 - Dec 15
- Requested dates: Dec 12 - Dec 18
- Overlap? Dec 12 <= Dec 15 AND Dec 18 >= Dec 10 → YES (conflict)

#### Step 4: Calculate Availability
```typescript
For each box:
  - If no bookings → isAvailable = true
  - If has bookings:
    - Check if requested dates conflict
    - If conflict → isAvailable = false, nextAvailableDate = latest booking end
    - If no conflict → isAvailable = true
```

#### Step 5: Return All Boxes (Including Booked)
```typescript
// Returns ALL boxes with:
- isAvailable: boolean
- nextAvailableDate: string | null (when it will be free)
```

**Key Point:** Even booked boxes are returned, so users can see when they'll be available.

---

## 4. UI Logic: LocationDetails Component

### Color Theme Logic:

```typescript
isBooked = location.isFullyBooked || false

// If isBooked:
  - Form: Red theme (bg-red-50, border-red-200)
  - Status: "Booked" (red badge)
  - Tabs: Red active state
  - Button: Red (bg-red-500)

// If NOT isBooked:
  - Form: White/Green theme
  - Status: "Available" (green badge)
  - Tabs: Green active state
  - Button: Green (bg-emerald-500)
```

### Model Selection Logic:

```typescript
For each model (Classic/Pro):
  - modelBooked = isModelFullyBooked(modelId)
  - modelAvailable = isModelAvailable(modelId) // Has boxes > 0
  
  // Models are ALWAYS clickable (even when booked)
  // Display:
  - If available: "Available" (green text)
  - If booked: "Booked - Available: [date]" (red text)
```

### Date Selection Logic:

```typescript
getMinDateForModel(modelId):
  - Get nextAvailableDate for that model
  - If model has bookings:
    - Return: nextAvailableDate + 1 day (can't book during booking)
  - Else:
    - Return: Today (can book now)
```

**Prevents:** Users from selecting dates when boxes are booked.

---

## 5. Complete Flow Example

### Scenario: Location with 10 boxes (5 Classic, 5 Pro)

#### Step 1: User opens map
```
API: /api/locations
- Fetches all locations
- For each location:
  - Counts boxes: 5 Classic, 5 Pro
  - Checks bookings: 8 boxes have bookings, 2 are free
  - Result: isFullyBooked = false (not all booked)
  - Classic: 2 available, 3 booked
  - Pro: 0 available, 5 booked
  - isProFullyBooked = true
```

#### Step 2: User clicks location
```
Component receives:
- isFullyBooked: false
- availableBoxes: { classic: 2, pro: 0, total: 2 }
- modelAvailability:
  - classic: { isFullyBooked: false, nextAvailableDate: null }
  - pro: { isFullyBooked: true, nextAvailableDate: "2025-12-20T10:00:00Z" }
```

#### Step 3: User selects "Pro" model
```
- Model shows: "Booked - Available: Dec 20, 2025"
- Model is clickable (can select)
- Date picker min date: Dec 21, 2025 (after booking ends)
```

#### Step 4: User selects dates (Dec 22 - Dec 25)
```
API: /api/locations/[id]/boxes?model=Pro&startDate=...&endDate=...
- Fetches all Pro boxes
- For each box:
  - Checks if Dec 22-25 conflicts with existing bookings
  - If conflict → isAvailable = false, shows nextAvailableDate
  - If no conflict → isAvailable = true
- Returns all boxes with availability status
```

#### Step 5: User sees boxes
```
- Available boxes: Can select (green)
- Booked boxes: Shows "Available: Dec 20, 2025" (grayed out, not selectable)
```

---

## 6. Key Logic Rules

### Rule 1: Location Fully Booked
```
IF (totalBoxes > 0) AND (all boxes have bookings)
THEN isFullyBooked = true
```

### Rule 2: Model Fully Booked
```
IF (model has boxes) AND (all model boxes have bookings)
THEN model is fully booked
```

### Rule 3: Box Available
```
IF (box has no bookings) OR (requested dates don't conflict)
THEN box is available
```

### Rule 4: Date Conflict
```
IF (requestedStart <= existingEnd) AND (requestedEnd >= existingStart)
THEN conflict exists
```

### Rule 5: Next Available Date
```
Next Available = Latest booking end date + 1 day
(Can't book on the same day booking ends)
```

---

## 7. Color & Status Logic

### Location Level:
- **Green/White**: Has available boxes
- **Red**: All boxes booked (fully booked)

### Model Level:
- **"Available"** (green): Has boxes with no bookings
- **"Booked - Available: [date]"** (red): All boxes booked, shows when free

### Box Level:
- **Selectable** (green border): Available for selected dates
- **Not Selectable** (gray): Booked, shows next available date

---

## Summary

1. **Database** stores boxes and bookings
2. **API counts** boxes and checks bookings
3. **Calculates** next available dates (latest booking end)
4. **UI displays** status and colors based on availability
5. **Date picker** prevents selecting booked dates
6. **Models** are always selectable (users can book future dates)
7. **All boxes** are shown (even booked ones) with availability info

The system ensures users can always see availability and book for future dates when locations are fully booked.

