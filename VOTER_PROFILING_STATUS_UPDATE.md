# Voter Profiling Status & Pre-population Update

## Overview
Enhanced the voter profiling form to show profiling status and pre-populate all existing profile data for updates.

## Changes Implemented

### 1. Profiling Status Indicator
**Visual Badge Display:**
- **Already Profiled** - Green badge with checkmark icon when voter has been profiled
- **Pending Profile** - Amber badge with clock icon for new profiles

**Status Information:**
- Shows last update timestamp for already profiled voters
- Timestamp format: "Last updated: 26 Jan, 2026 03:45 PM"

### 2. Pre-population of Profile Data
**All Profile Fields Now Pre-filled:**
When editing an already profiled voter, the form now pre-populates:
- ✅ Education level
- ✅ Occupation type (business/service)
- ✅ Occupation detail (business type or service category)
- ✅ Region/Locality
- ✅ Religion (from profile, falls back to voter master data)
- ✅ Caste (from profile, falls back to voter master data)
- ✅ Supporter status (checkbox)
- ✅ Feedback (if not a supporter)
- ✅ Influencer type
- ✅ Vehicle type

### 3. Smart Button Labels
**Context-Aware Button Text:**
- New Profile: "Save Profile" / "Saving..."
- Update Profile: "Update Profile" / "Updating..."

### 4. Related Voters Recommendation
**Only for New Profiles:**
- Related voter recommendations now only appear for newly profiled voters
- When updating an existing profile, the related voters prompt is skipped
- This prevents repetitive prompts for family members

## Technical Changes

### Component Updates: `field-profiling-form.tsx`

#### Updated Voter Interface
```typescript
interface Voter {
  // ... existing fields ...
  occupationDetail?: string | null;  // NEW
  region?: string | null;             // NEW
  profileReligion?: string | null;    // NEW
  profileCaste?: string | null;       // NEW
  feedback?: string | null;           // NEW
}
```

#### Smart Initialization
```typescript
const isAlreadyProfiled = voter.isProfiled === true;

const [formData, setFormData] = useState({
  education: voter.education || '',
  occupationType: voter.occupationType || '',
  occupationDetail: voter.occupationDetail || '',     // Pre-filled
  region: voter.region || '',                         // Pre-filled
  religion: voter.profileReligion || voter.religion || '',  // Pre-filled
  caste: voter.profileCaste || voter.caste || '',     // Pre-filled
  isOurSupporter: voter.isOurSupporter || false,
  feedback: voter.feedback || '',                     // Pre-filled
  influencerType: voter.influencerType || '',
  vehicleType: voter.vehicleType || '',
});
```

### API Updates

#### Updated: `GET /api/field-visitor/voters`
Now returns complete profile data:
```typescript
{
  // Voter master fields
  epicNumber, fullName, age, gender, religion, caste, ...
  
  // Complete profile fields
  isProfiled,
  education,
  occupationType,
  occupationDetail,      // NEW
  region,                // NEW
  profileReligion,       // NEW (from VoterProfile)
  profileCaste,          // NEW (from VoterProfile)
  feedback,              // NEW
  isOurSupporter,
  influencerType,
  vehicleType,
  profiledAt
}
```

#### Updated: `GET /api/field-visitor/related-voters`
Also returns complete profile data with same fields.

## User Experience Improvements

### Before:
- ❌ No indication if voter was already profiled
- ❌ Had to manually re-enter all data when updating
- ❌ Same button text for new and update operations
- ❌ Related voters prompt appeared even when updating

### After:
- ✅ Clear visual indicator of profiling status
- ✅ All existing data automatically loaded for updates
- ✅ Context-aware button labels
- ✅ Smart related voters prompt (only for new profiles)
- ✅ Shows when profile was last updated

## Visual Design

### Status Badge Styles

**Already Profiled:**
```
┌─────────────────────────────┐
│ ✓  Already Profiled         │  Green background
└─────────────────────────────┘
Last updated: 26 Jan, 2026 03:45 PM
```

**Pending Profile:**
```
┌─────────────────────────────┐
│ ⏰ Pending Profile          │  Amber background
└─────────────────────────────┘
```

## Usage Workflow

### Editing an Already Profiled Voter:

1. **Select Voter** - Navigate to voter list and select a profiled voter
2. **Visual Confirmation** - Green "Already Profiled" badge appears
3. **Pre-filled Form** - All fields automatically populate with existing data
4. **Make Changes** - Update any fields as needed
5. **Save** - Click "Update Profile" button
6. **Success** - "Profile updated successfully" message appears
7. **No Prompts** - Related voters prompt is skipped

### Profiling a New Voter:

1. **Select Voter** - Navigate to voter list and select an unprofiled voter
2. **Visual Confirmation** - Amber "Pending Profile" badge appears
3. **Empty Form** - Fields are empty except basic voter info
4. **Fill Data** - Enter all profiling information
5. **Save** - Click "Save Profile" button
6. **Success** - "Profile saved successfully" message appears
7. **Related Voters** - Prompt appears for family members (if any)

## Benefits

1. **Efficiency** - No need to re-enter data when updating profiles
2. **Clarity** - Clear visual indication of profiling status
3. **Accuracy** - Pre-filled data reduces errors during updates
4. **Better UX** - Context-aware labels and actions
5. **Time Savings** - Faster workflow for field visitors
6. **Data Integrity** - Easier to maintain accurate voter profiles

## Files Modified

### Components:
- `components/field-profiling-form.tsx` - Added status display and pre-population

### API Routes:
- `app/api/field-visitor/voters/route.ts` - Returns complete profile data
- `app/api/field-visitor/related-voters/route.ts` - Returns complete profile data

## Testing Checklist

- [x] Already profiled voters show green badge
- [x] New voters show amber badge
- [x] All profile fields pre-populate for updates
- [x] Religion and caste fall back to voter master data if profile data missing
- [x] Button shows "Update Profile" for existing profiles
- [x] Button shows "Save Profile" for new profiles
- [x] Last updated timestamp displays correctly
- [x] Related voters prompt only shows for new profiles
- [x] Form validation works for both new and update operations

## Notes

- Religion and caste have dual sources:
  - `profileReligion`/`profileCaste` from VoterProfile table (profiling data)
  - `religion`/`caste` from VoterMaster table (electoral roll data)
- Profile data takes precedence, with voter master as fallback
- All profile fields are optional and nullable in database
- Status indicator is responsive and works on mobile devices
