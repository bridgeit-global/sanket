# Beneficiary Management System

This application now includes a comprehensive beneficiary management system that allows tracking of services provided to voters in the Anushakti Nagar constituency.

## Features

### Service Types

1. **One-to-One Services**: Individual voter services
   - Voter registration assistance
   - Aadhar card applications
   - Ration card applications
   - Government scheme applications

2. **One-to-Many Services**: Public works affecting multiple voters
   - Fund utilization projects
   - Issue visibility campaigns
   - Infrastructure development
   - Public works carried out in specific parts

### Database Schema

#### Services Table
- `id`: Unique identifier
- `name`: Service name
- `description`: Service description
- `type`: 'one-to-one' or 'one-to-many'
- `category`: Service category (e.g., 'voter_registration', 'aadhar_card', 'public_works')
- `isActive`: Whether the service is active
- `createdAt`, `updatedAt`: Timestamps

#### Beneficiaries Table
- `id`: Unique identifier
- `serviceId`: Reference to the service
- `voterId`: Voter ID (for one-to-one services)
- `partNo`: Part number (for one-to-many services)
- `status`: 'pending', 'in_progress', 'completed', 'rejected'
- `notes`: Additional notes
- `applicationDate`: When the beneficiary was added
- `completionDate`: When the service was completed
- `isActive`: Whether the beneficiary record is active
- `createdAt`, `updatedAt`: Timestamps

### AI Tools

The system provides the following AI tools for managing beneficiaries:

1. **getServices**: Get all available services
   - Returns services grouped by type (one-to-one vs one-to-many)
   - Shows service categories and descriptions

2. **addService**: Add a new service to the system
   - Requires: name, type, category
   - Optional: description

3. **addBeneficiary**: Add a beneficiary to a service
   - For one-to-one services: requires serviceId and voterId
   - For one-to-many services: requires serviceId and partNo
   - Optional: notes

4. **getBeneficiaries**: Get beneficiary information
   - Can search by serviceId, voterId, or partNo
   - If no parameters provided, returns overall statistics
   - Shows status breakdown and service breakdown

5. **updateBeneficiary**: Update beneficiary status
   - Can update status, notes, and completion date
   - Supports all status types: pending, in_progress, completed, rejected

### Usage Examples

#### Adding a Service
```
User: "Add a new service for voter registration"
AI: Uses addService tool with:
- name: "Voter Registration"
- type: "one-to-one"
- category: "voter_registration"
- description: "Assistance with voter registration process"
```

#### Adding a Beneficiary
```
User: "Add voter TEST001 to voter registration service"
AI: Uses addBeneficiary tool with:
- serviceId: [service ID]
- voterId: "TEST001"
- notes: "Voter registration assistance"
```

#### Getting Beneficiary Information
```
User: "Show me beneficiaries for voter TEST001"
AI: Uses getBeneficiaries tool with:
- voterId: "TEST001"
```

#### Updating Beneficiary Status
```
User: "Mark beneficiary [ID] as completed"
AI: Uses updateBeneficiary tool with:
- beneficiaryId: [ID]
- status: "completed"
```

### UI Components

The system includes a `BeneficiaryInsights` component that displays:

1. **Services Display**: Shows all available services grouped by type
2. **Service Added Display**: Confirmation when a service is added
3. **Beneficiary Added Display**: Confirmation when a beneficiary is added
4. **Beneficiaries Display**: Shows beneficiary information with status badges
5. **Beneficiary Updated Display**: Confirmation when a beneficiary is updated

### Integration

The beneficiary management system is fully integrated with:

- **Chat API**: All tools are available in the chat interface
- **Message Component**: Displays beneficiary information in chat messages
- **System Prompt**: Updated to include beneficiary management instructions
- **Type System**: All tools are properly typed and integrated

### Database Queries

The system provides comprehensive database queries:

- `getAllServices()`: Get all active services
- `createService()`: Create a new service
- `getBeneficiariesByService()`: Get beneficiaries for a specific service
- `getBeneficiariesByVoter()`: Get all services for a specific voter
- `getBeneficiariesByPart()`: Get all services for a specific part
- `createBeneficiary()`: Add a new beneficiary
- `updateBeneficiary()`: Update beneficiary information
- `getBeneficiaryStats()`: Get overall statistics

### Status Tracking

Beneficiaries can have the following statuses:

- **pending**: Service request submitted
- **in_progress**: Service is being processed
- **completed**: Service has been completed
- **rejected**: Service request was rejected

### Categories

Services are categorized for better organization:

- `voter_registration`: Voter registration assistance
- `aadhar_card`: Aadhar card applications
- `ration_card`: Ration card applications
- `schemes`: Government scheme applications
- `public_works`: Public infrastructure projects
- `fund_utilization`: Fund utilization projects
- `issue_visibility`: Issue visibility campaigns

This system provides a comprehensive solution for tracking and managing services provided to voters in the Anushakti Nagar constituency, with support for both individual voter services and public works affecting multiple voters. 