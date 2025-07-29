# Beneficiary Management Quick Reference

## Quick Actions

### View Services
- **"Show me all available services"** - Lists all services with categories
- **"What services are available?"** - Same as above

### Add Services
- **"Add a new service for voter registration"** - Creates one-to-one service
- **"Add a public works service for road construction"** - Creates one-to-many service
- **"Add Aadhar card service"** - Creates individual voter service
- **"Add ration card service"** - Creates individual voter service
- **"Add government schemes service"** - Creates individual voter service

### Add Beneficiaries
- **"Add voter TEST001 to voter registration service"** - Links individual voter to service
- **"Add Part 5 to road construction service"** - Links multiple voters (part) to service
- **"Add beneficiary to Aadhar service for voter TEST002"** - Individual beneficiary
- **"Add beneficiary to public works for Part 3"** - Multiple beneficiaries

### Get Beneficiary Information
- **"Show me beneficiaries for voter TEST001"** - Individual voter tracking
- **"Get beneficiaries for voter registration service"** - Service tracking
- **"Show beneficiaries for Part 5"** - Area tracking
- **"Get beneficiary statistics"** - Overall dashboard

### Update Beneficiary Status
- **"Mark beneficiary as pending"** - Service request submitted
- **"Update status to in progress"** - Service being processed
- **"Mark as completed"** - Service finished
- **"Reject beneficiary"** - Service request denied

## Service Categories

### One-to-One Services (Individual Voters)
- `voter_registration` - Voter registration assistance
- `aadhar_card` - Aadhar card applications
- `ration_card` - Ration card applications
- `schemes` - Government scheme applications

### One-to-Many Services (Public Works)
- `public_works` - Infrastructure projects
- `fund_utilization` - Fund utilization tracking
- `issue_visibility` - Issue visibility campaigns

## Status Types
- `pending` - Service request submitted
- `in_progress` - Service being processed
- `completed` - Service finished
- `rejected` - Service request denied

## Example Workflows

### Adding a New Service
1. "Add a new service for voter registration"
2. AI will prompt for details or use defaults
3. Service is created and available for beneficiaries

### Adding a Beneficiary
1. "Add voter TEST001 to voter registration service"
2. AI validates voter exists and service is one-to-one
3. Beneficiary is created with pending status

### Tracking Progress
1. "Show me beneficiaries for voter TEST001"
2. View all services for that voter
3. "Update status to in progress" for specific beneficiary

### Public Works
1. "Add a public works service for road construction in Part 5"
2. "Add Part 5 to road construction service"
3. All voters in Part 5 are now beneficiaries

## Natural Language Examples

### Service Management
- "I need to add a new service for Aadhar card applications"
- "Create a service for government scheme assistance"
- "Add a public works service for water supply in Part 3"

### Beneficiary Management
- "Add voter ID 12345 to the voter registration service"
- "Link Part 7 to the road construction project"
- "Show me all services for voter Kumar"
- "What beneficiaries are in the Aadhar card service?"

### Status Updates
- "Mark the voter registration for TEST001 as completed"
- "Update the Aadhar service status to in progress"
- "Reject the ration card application for TEST002"

### Reporting
- "Show me beneficiary statistics"
- "Get overall dashboard"
- "What's the status breakdown?"
- "How many completed services do we have?"

## Tips

1. **Be specific**: Mention voter ID or part number clearly
2. **Use service names**: Reference existing services by name
3. **Include notes**: Add context when creating beneficiaries
4. **Check status**: Always verify current status before updating
5. **Use categories**: Services are organized by categories for easy management

## Common Patterns

### Individual Voter Service
```
"Add [voter_id] to [service_name] with notes [description]"
```

### Public Works Service
```
"Add Part [number] to [service_name] with notes [description]"
```

### Status Update
```
"Update [service_name] status to [pending/in_progress/completed/rejected]"
```

### Information Query
```
"Show me beneficiaries for [voter_id/service_name/part_number]"
```

This quick reference helps users efficiently manage the beneficiary system using natural language commands. 