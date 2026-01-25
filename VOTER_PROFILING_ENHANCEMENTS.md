# Voter Profiling Enhancements

## Overview
Enhanced the voter profiling form with new fields and smart features to improve data collection and workflow efficiency.

## Changes Implemented

### 1. Region/Locality Dropdown
**Changed from:** Free text input  
**Changed to:** Dropdown select with predefined options

**Options:**
- Maharashtra
- North Indian
- Bengal
- Rajasthan
- Gujarat
- SI

### 2. Religion Field
**New Field:** Added religion dropdown to profiling form

**Options:**
- Hindu
- Muslim
- Christian
- Buddhist
- Jain
- Sikh
- Other

### 3. Caste Field
**New Field:** Added caste category dropdown to profiling form

**Options:**
- General
- OBC
- SC
- ST
- NT
- VJ
- Other

### 4. Feedback for Non-Supporters
**Feature:** When a voter is marked as "Not a supporter", a feedback textarea appears

**Purpose:** Capture reasons why they are not supporters, concerns, or any relevant feedback

**Implementation:**
- Conditional display based on supporter checkbox
- Multi-line textarea for detailed feedback
- Optional field (not required)

### 5. Related Voter Profiling Recommendation
**Feature:** After successfully profiling a voter, the system automatically suggests related voters from the same family

**Workflow:**
1. User completes profiling a voter
2. System queries for unprofiled voters from the same family grouping
3. Displays a card with related voters (up to 10)
4. Each related voter shows:
   - Full name
   - EPIC number
   - Relation type and name
   - Age and gender
5. User can click "Profile Now" to immediately profile a related voter
6. Pre-fills region, religion, and caste from the previous voter
7. User can skip and continue later

**Benefits:**
- Faster family profiling
- Consistent data for family members
- Better workflow efficiency
- Reduces data entry time

### 6. Smart Pre-filling
When profiling a related voter, the following fields are pre-filled:
- **Region** (carried over)
- **Religion** (carried over)
- **Caste** (carried over)

The following fields are reset:
- Education
- Occupation Type
- Occupation Detail
- Supporter Status
- Feedback
- Influencer Type
- Vehicle Type

## Database Changes

### New Columns in `VoterProfile` Table:
```sql
ALTER TABLE "VoterProfile" ADD COLUMN "religion" varchar(50);
ALTER TABLE "VoterProfile" ADD COLUMN "caste" varchar(50);
ALTER TABLE "VoterProfile" ADD COLUMN "feedback" text;
```

**Migration File:** `lib/db/migrations/0057_hard_barracuda.sql`

## API Changes

### Updated Endpoint: `POST /api/field-visitor/profile`
**New Fields Accepted:**
- `religion` (string, optional)
- `caste` (string, optional)
- `feedback` (text, optional)

### New Endpoint: `GET /api/field-visitor/related-voters`
**Purpose:** Fetch unprofiled voters from the same family

**Query Parameters:**
- `familyGrouping` (required) - The family group ID
- `epicNumber` (required) - Current voter's EPIC to exclude from results

**Response:**
```json
{
  "success": true,
  "voters": [
    {
      "epicNumber": "ABC1234567",
      "fullName": "John Doe",
      "relationType": "Father",
      "relationName": "Richard Doe",
      "age": 45,
      "gender": "M",
      ...
    }
  ]
}
```

## Files Modified

### Components:
- `components/field-profiling-form.tsx` - Main profiling form with all new features

### API Routes:
- `app/api/field-visitor/profile/route.ts` - Updated to handle new fields
- `app/api/field-visitor/related-voters/route.ts` - New endpoint for fetching related voters

### Database:
- `lib/db/schema.ts` - Updated VoterProfile schema
- `lib/db/migrations/0057_hard_barracuda.sql` - Migration for new columns

## Usage Instructions

1. **Navigate to Voter Profiling:**
   - Click on the "Voter" button in the navigation
   - Select a voter to profile

2. **Fill in the Form:**
   - Select education level
   - Choose occupation type (business/service)
   - **Select region from dropdown** (new)
   - **Select religion from dropdown** (new)
   - **Select caste category from dropdown** (new)
   - Check if voter is a supporter
   - If NOT a supporter, provide feedback in the textarea
   - Select influencer type (if applicable)
   - Select vehicle type (if applicable)

3. **Save and Continue:**
   - Click "Save Profile"
   - If related voters exist, a card will appear
   - Click "Profile Now" on any related voter to continue
   - Or click "Skip for Now" to finish

## Benefits

1. **Standardized Data:** Dropdown options ensure consistent data entry
2. **Better Insights:** Feedback field captures valuable information about non-supporters
3. **Efficient Workflow:** Related voter suggestions speed up family profiling
4. **Smart Pre-filling:** Reduces repetitive data entry for family members
5. **Comprehensive Profiling:** Religion and caste fields enable better demographic analysis

## Technical Notes

- All new fields are optional (nullable in database)
- Feedback field only appears when supporter checkbox is unchecked
- Related voters query excludes already profiled voters
- Pre-filled values can be changed by the user
- Maximum 10 related voters shown at a time
- Family grouping is used to identify related voters
