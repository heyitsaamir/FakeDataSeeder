# Microsoft Graph Token Service

This service handles OAuth 2.0 authentication with Microsoft Graph API to obtain and store access tokens for users.

## Setup

1. Register an application in the Microsoft Azure Portal:

   - Go to the [Azure Portal](https://portal.azure.com)
   - Navigate to "Azure Active Directory" → "App registrations" → "New registration"
   - Name your application and set the Redirect URI to `http://localhost:3000/auth/callback`
   - Note the Application (client) ID

2. Create a client secret:

   - In your registered app, go to "Certificates & secrets" → "New client secret"
   - Copy the generated secret value

3. Configure environment variables:
   - Copy the `.env.example` file to `.env`
   - Fill in your `MS_CLIENT_ID` and `MS_CLIENT_SECRET` values

## Running the Service

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run in production
npm start
```

## API Endpoints

- `GET /auth/url`: Generates the Microsoft authorization URL for the user to visit
- `GET /auth/callback`: Handles the OAuth callback from Microsoft, exchanges the code for tokens, and stores them
- `POST /auth/refresh/:userId`: Refreshes the access token for a specific user using their refresh token
- `GET /tokens`: (Development only) Shows all stored tokens
- `GET /health`: Service health check endpoint

## How It Works

1. The client application requests an authorization URL from `/auth/url`
2. User visits this URL and authenticates with Microsoft
3. Microsoft redirects back to `/auth/callback` with an authorization code
4. The service exchanges this code for access and refresh tokens
5. Tokens are stored in a local file for future use
6. When a token expires, the client can call `/auth/refresh/:userId` to get a new access token

## Security Notes

- Never commit your `.env` file or expose your client secret
