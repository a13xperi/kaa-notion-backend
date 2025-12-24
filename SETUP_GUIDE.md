# KAA App Enhanced Setup Guide

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following:

```bash
# Notion API Configuration
NOTION_API_KEY=your_notion_integration_token_here
NOTION_PARENT_PAGE_ID=your_parent_page_id_for_databases

# Database IDs (optional - will auto-create if not set)
CLIENT_CREDENTIALS_DB_ID=
CLIENT_DOCUMENTS_DB_ID=
ACTIVITY_LOG_DB_ID=

# Email Configuration (for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
TEAM_EMAIL=team@kaa.com

# Frontend URL (for email links)
FRONTEND_URL=https://kaa-app.vercel.app

# Server Configuration
PORT=3001
NODE_ENV=production
```

## 📧 Email Setup (Gmail)

1. Go to Google Account Settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other" (custom name)
   - Copy the 16-character password
4. Use this password as `EMAIL_PASSWORD` in `.env`

## 🗄️ Database Setup

The server will automatically create three databases in Notion:

### 1. **Client Credentials** (Admin/Team Only)
Stores client login information:
- Address (Title)
- Email
- Password Hash
- Access Code
- Active (Checkbox)
- Expiry Date
- Last Login
- Created Date

### 2. **Client Activity Log** (Admin/Team Only)
Tracks all client actions:
- Client Address
- Action (Login, Upload, etc.)
- Details (JSON)
- Timestamp

### 3. **Client Documents** (Shared with Clients)
Stores uploaded documents:
- Title (Filename)
- Client Address
- Category (Document, Invoice, Contract, etc.)
- Upload Date
- Description
- File (Reference)

## 🚀 Deployment

### Backend (Vercel)
```bash
cd "/Users/alex/KAA app/KAA app"
vercel --prod
```

Set environment variables in Vercel dashboard:
- `NOTION_API_KEY`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `TEAM_EMAIL`
- `FRONTEND_URL`

### Frontend (Vercel)
```bash
cd "/Users/alex/KAA app/KAA app/kaa-app"
vercel --prod
```

Set environment variable:
- `REACT_APP_API_URL` = your backend URL

## 👥 Creating Clients

### Method 1: API Endpoint
```bash
curl -X POST https://your-backend.vercel.app/api/admin/clients/create \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main Street, Austin TX",
    "email": "client@example.com",
    "password": "SecurePass123"
  }'
```

Response:
```json
{
  "success": true,
  "client": {
    "id": "page-id",
    "address": "123 Main Street, Austin TX",
    "email": "client@example.com",
    "accessCode": "XYZ789AB"
  }
}
```

The client will receive an email with their access code.

### Method 2: Manual in Notion
1. Open "Client Credentials" database
2. Click "New"
3. Fill in:
   - Address: Client's project address
   - Email: Client's email
   - Password Hash: Generate using bcrypt (or use demo123)
   - Access Code: Random 8-character code
   - Active: ✅ Checked
4. Manually email the client their credentials

## 📤 Document Upload Flow

1. Client logs in with address + access code
2. Clicks "📤 Upload" button
3. Selects file (max 10MB)
4. Chooses category and adds description
5. Clicks "Upload Document"
6. File is uploaded to Notion
7. Team receives email notification
8. Client can view uploaded document in their workspace

## 🔒 Security Features

### Password Storage
- Passwords are hashed using bcrypt (10 rounds)
- Access codes are randomly generated
- Both can be used for login

### Session Management
- Credentials stored in localStorage
- Automatic login for returning clients
- Logout clears all saved data

### Activity Logging
- All logins tracked with timestamp and IP
- All uploads logged with file details
- Failed login attempts recorded

### Access Control
- Clients can only see their own documents
- Filtering by "Client Address" property
- Active/Inactive status enforcement
- Expiry date support

## 🎯 Client Workspace Features

### Smart Filtering (Priority Order)
1. ✅ Pages with "Client Address" property matching
2. ✅ Pages in databases matching client address
3. ✅ Pages in teamspaces matching client address
4. ✅ Page titles containing client address

### Document Upload
- ✅ Drag and drop support
- ✅ File size validation (10MB max)
- ✅ Category selection
- ✅ Optional description
- ✅ Real-time progress
- ✅ Success confirmation

### Notifications
- ✅ Client receives welcome email with credentials
- ✅ Team notified on client login
- ✅ Team notified on document upload
- ✅ Activity logged in Notion

## 📊 Usage Examples

### Demo Mode
- Address: Any address
- Password: `demo123`
- No email notifications sent

### Production Mode
1. Create client via API
2. Client receives email with access code
3. Client logs in at portal
4. Client uploads documents
5. Team is notified
6. Documents appear in Notion

## 🛠️ Troubleshooting

### "Email not configured" warning
- Set `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Use Gmail App Password (not regular password)

### "Database not found" errors
- Ensure Notion integration has access to workspace
- Set `NOTION_PARENT_PAGE_ID` to a valid page ID
- Server will auto-create databases on first run

### File upload fails
- Check file size is under 10MB
- Ensure `CLIENT_DOCUMENTS_DB_ID` is set or auto-created
- Check Notion API permissions

### Clients can't see documents
- Ensure "Client Address" property exists in database
- Check property value matches login address exactly
- Verify address spelling and capitalization

## 📝 Best Practices

1. **Client Addresses**: Use consistent format
   - Good: "123 Main Street, Austin TX"
   - Bad: "123 main st" (inconsistent)

2. **Database Structure**: Create dedicated databases per client or project
   - "ABC Corp - Project Files"
   - Add "Client Address" property to all pages

3. **Email Templates**: Customize welcome emails
   - Include project manager contact
   - Add support phone/email
   - Link to FAQ or help docs

4. **Security**: 
   - Use strong passwords when creating clients
   - Set expiry dates for temporary access
   - Regularly audit activity logs
   - Disable inactive clients

5. **File Organization**:
   - Use consistent categories
   - Encourage descriptive filenames
   - Set up Notion views by category/date

## 🎉 You're All Set!

The KAA Client Portal now includes:
- ✅ Secure password authentication with bcrypt
- ✅ Email notifications for clients and team
- ✅ Document upload functionality
- ✅ Activity logging and tracking
- ✅ Admin endpoints for client management
- ✅ Mobile-responsive interface
- ✅ Demo mode for testing

Ready to deploy and start managing clients! 🚀

