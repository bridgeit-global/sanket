# Beneficiary Service Ticket Requirements

## Overview
When adding a beneficiary service ticket, the system MUST always ask for ALL relevant details to ensure comprehensive service tracking and effective beneficiary management.

## Critical Requirements

### 1. Service Details (Always Required)
- **Service Name**: Clear, descriptive name of the service
- **Service Type**: 
  - `one-to-one`: Individual voter services (voter registration, Aadhar card, etc.)
  - `one-to-many`: Community/public works affecting multiple voters
- **Service Category**: 
  - voter_registration
  - aadhar_card
  - ration_card
  - government_schemes
  - health_services
  - education_services
  - employment_services
  - public_works
  - infrastructure
  - fund_utilization
  - issue_visibility
  - community_development
  - other
- **Description**: Detailed description of the service
- **Priority Level**: low, medium, high, urgent
- **Expected Duration**: Timeframe for completion (e.g., "2-3 weeks", "1 month", "Ongoing")
- **Requirements**: Documents or prerequisites needed
- **Target Audience**: Specific beneficiaries (e.g., "Senior citizens", "Women", "Youth", "All voters")

### 2. Individual Services (one-to-one) - Required Details
- **Voter ID**: If beneficiary is an existing voter
- **Beneficiary Name**: Full name of the beneficiary
- **Age**: Age of the beneficiary
- **Gender**: male, female, other
- **Mobile Number**: Contact number
- **Email Address**: Email contact (if available)
- **Address**: Complete address
- **Family Name**: Surname or family name
- **Outside Voter Flag**: If beneficiary is not in voter database
- **Notes**: Additional information or special requirements

### 3. Community Services (one-to-many) - Required Details
- **Part Number**: Geographic area identifier
- **Area Details**: Specific location or ward information
- **Target Audience**: Who will benefit from this service
- **Expected Beneficiaries**: Number or description of affected people
- **Community Requirements**: Specific needs or conditions
- **Impact Assessment**: Expected outcomes and benefits
- **Resource Requirements**: Materials, personnel, or funding needed

### 4. Additional Information (Always Collected)
- **Contact Information**: How to reach the beneficiary or responsible person
- **Special Considerations**: Any unique requirements or circumstances
- **Documentation Requirements**: What documents are needed
- **Follow-up Requirements**: Any ongoing support or monitoring needed
- **Notes**: Additional context or important information

## Implementation Guidelines

### For AI Assistant
1. **NEVER proceed** with adding a beneficiary service ticket without collecting comprehensive details
2. **Always ask** for missing information when user provides incomplete details
3. **Validate** that all required fields are provided before submission
4. **Confirm** details with the user before finalizing the ticket

### For Individual Services
- Ask for voter ID if available
- Collect complete personal details
- Verify contact information
- Confirm service requirements

### For Community Services
- Ask for part number and area details
- Collect community impact information
- Verify resource requirements
- Confirm target audience

## Examples of Required Information Collection

### Example 1: Individual Voter Service
```
Service: Voter Registration
Type: one-to-one
Category: voter_registration
Priority: high
Duration: 1 week
Requirements: ID proof, address proof
Beneficiary: John Doe
Voter ID: V12345
Age: 35
Gender: male
Mobile: 9876543210
Address: 123 Main Street, Anushakti Nagar
Notes: First-time voter registration
```

### Example 2: Community Service
```
Service: Road Repair
Type: one-to-many
Category: infrastructure
Priority: medium
Duration: 2-3 weeks
Requirements: Municipal approval, contractor
Part Number: 15
Target Audience: All residents in Part 15
Expected Beneficiaries: 500+ residents
Community Requirements: Traffic management during work
Impact Assessment: Improved road connectivity
Resource Requirements: Construction materials, labor, equipment
```

## Quality Assurance Checklist

Before submitting a beneficiary service ticket, ensure:

- [ ] Service details are complete and accurate
- [ ] Beneficiary information is comprehensive
- [ ] Contact information is provided
- [ ] Requirements are clearly specified
- [ ] Priority level is appropriate
- [ ] Expected duration is realistic
- [ ] Target audience is defined
- [ ] Special considerations are noted
- [ ] Follow-up requirements are identified

## Error Prevention

- **Missing Voter ID**: For individual services, always ask for voter ID or confirm outside voter status
- **Incomplete Contact Info**: Always collect at least one contact method (mobile or email)
- **Unclear Requirements**: Ask for specific document or requirement details
- **Missing Priority**: Always assign a priority level
- **Vague Duration**: Ask for specific timeframe estimates

This ensures that all beneficiary service tickets contain the necessary information for effective service delivery and tracking. 