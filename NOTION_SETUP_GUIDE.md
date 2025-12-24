# 🎯 KAA Notion Workspace Setup Guide

## 📋 **Required Notion Structure**

### **1. Clients Database**
Create a new database called "Clients" with these properties:

| Property Name | Type | Description |
|---------------|------|-------------|
| `Client Name` | Title | Primary identifier (e.g., "123 Main Street Project") |
| `Project Address` | Rich Text | Full project address (used for login) |
| `Access Code` | Rich Text | Client login password |
| `Last Name` | Rich Text | Client last name for verification |
| `Email` | Email | Client contact email |
| `Status` | Select | Options: Active, Inactive, Pending |
| `Created Date` | Date | When client was added |
| `Last Login` | Date | Last successful login |
| `Project Manager` | Person | KAA team member assigned |
| `Phone` | Phone Number | Client phone number |
| `Project Type` | Select | Options: Residential, Commercial, Renovation |
| `Budget Range` | Select | Options: Under $50k, $50k-$100k, $100k-$250k, $250k+ |

### **2. Client Documents Database**
Create a database called "Client Documents" with these properties:

| Property Name | Type | Description |
|---------------|------|-------------|
| `Document Name` | Title | Name of the document |
| `Client Address` | Relation | Links to Clients database |
| `Category` | Select | Options: Contract, Invoice, Report, Photo, Plan, Permit |
| `Upload Date` | Date | When document was uploaded |
| `File` | Files | The actual document file |
| `Description` | Rich Text | Document description |
| `Uploaded By` | Person | Who uploaded the document |
| `Status` | Select | Options: Draft, Review, Approved, Archived |
| `Tags` | Multi-select | Options: Urgent, Final, Revision, Legal |

### **3. Client Activities Database**
Create a database called "Client Activities" for logging:

| Property Name | Type | Description |
|---------------|------|-------------|
| `Activity` | Title | Description of the activity |
| `Client Address` | Relation | Links to Clients database |
| `Activity Type` | Select | Options: Login, Document Upload, Page View, Contact |
| `Timestamp` | Date | When activity occurred |
| `IP Address` | Rich Text | Client IP for security |
| `User Agent` | Rich Text | Browser/device info |
| `Details` | Rich Text | Additional activity details |

## 🎯 **Sample Client Setup**

### **Test Client 1:**
- **Client Name:** "Demo Project - 123 Main Street"
- **Project Address:** "123 Main Street, Austin, TX 78701"
- **Access Code:** "demo123"
- **Last Name:** "Demo"
- **Email:** "demo@example.com"
- **Status:** "Active"
- **Project Manager:** [Your name]
- **Project Type:** "Residential"
- **Budget Range:** "$100k-$250k"

### **Test Client 2:**
- **Client Name:** "Oak Avenue Renovation"
- **Project Address:** "456 Oak Avenue, Austin, TX 78702"
- **Access Code:** "oak2024"
- **Last Name:** "Smith"
- **Email:** "smith@example.com"
- **Status:** "Active"
- **Project Manager:** [Your name]
- **Project Type:** "Renovation"
- **Budget Range:** "$50k-$100k"

## 📁 **Client Page Structure**

Each client should have a dedicated page with these sections:

### **Page Template:**
```
# [Client Name] Project

## 📊 Project Overview
- **Status:** [Active/Inactive/Pending]
- **Start Date:** [Date]
- **Expected Completion:** [Date]
- **Budget:** [Amount]
- **Project Manager:** [Name]

## 📄 Documents
[Linked view of Client Documents filtered by this client]

## 📅 Timeline
- [ ] Initial Consultation
- [ ] Design Approval
- [ ] Permits Obtained
- [ ] Construction Start
- [ ] Final Walkthrough
- [ ] Project Complete

## 💬 Communications
[Notes and updates from team]

## 📋 Tasks
[Current tasks and to-dos]

## 📊 Progress
[Project progress tracking]
```

## 🔧 **Integration Requirements**

### **Database IDs Needed:**
After creating the databases, you'll need to provide these IDs:
1. **Clients Database ID** - For client authentication
2. **Client Documents Database ID** - For document management
3. **Client Activities Database ID** - For activity logging

### **Notion API Key:**
- Ensure your Notion integration has access to:
  - Read content
  - Update content
  - Insert content
  - Query databases

## 🚀 **Next Steps**

1. **Create the databases** in your Notion workspace
2. **Add sample clients** using the test data above
3. **Create client pages** using the template
4. **Get database IDs** from the Notion URLs
5. **Update backend configuration** with the new IDs
6. **Test the integration** with real data

## 📝 **Database ID Extraction**

To get database IDs from Notion URLs:
1. Open the database in Notion
2. Copy the URL (looks like: `https://notion.so/workspace/Database-Name-32charID`)
3. Extract the 32-character ID from the end
4. Add hyphens to make it a proper UUID format

Example:
- URL: `https://notion.so/workspace/Clients-1234567890abcdef1234567890abcdef`
- Database ID: `12345678-90ab-cdef-1234-567890abcdef`
