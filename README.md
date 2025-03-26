# Fake Data Seeder

This project provides a way to authenticate and seed fake data to your test tenants. The main components are:
1. Mocks to build out your mock data
2. A backend service to authenticate with Microsoft and seed the data
3. A frontend for users to authenticate and store tokens
4. An admin portal frontend.

## Prereq
1. Node.js
2. npm
3. Azure AD Tenant (Admin access)
4. Devtunnel / ngrok

## Mocks
The src/mocks folder contains the mocks, transformers and sanitizers for the data. Currently it just works with reddit comments, but you can build your own.
To use the reddit comments one, find any reddit thread, and extract its subreddit and thread id. Then go to https://reddit.com/r/<subreddit>/comments/<threadid>.json. Save the json in a `data` folder under the `reddit` folder. Then run `npm run mockgen` to generate the mock data.

## Backend Service

The backend service requires some .env variables to be set. First you will need to set up your app in Azure. Then you'll bring those values into the .env file.

### Creating a public facing URL

I used devtunnel to create a public facing URL. Here is my bash function that does that:
```bash
create_tunnel () {
        local mytunnel=$1 
        local port=$2 
        devtunnel create $mytunnel
        devtunnel port create $mytunnel -p $port
        devtunnel access create $mytunnel -p $port --anonymous
}
```
Then call it with `create_tunnel <tunnelname> 3000` to create a tunnel on port 3000.
Run the tunnel with `devtunnel host <tunnelname>`. This will give you a public facing URL that you can use in your app registration.

### Setup your app

1. Register an application in the Microsoft Azure Portal:

   - Go to the [Azure Portal](https://portal.azure.com)
   - Navigate to "Azure Active Directory" → "App registrations" → "New registration"
   - Name your application and set the Redirect URI to `https://<devtunnelurl>/auth/callback`
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
```

## Frontend

If you go to `https://<devtunnelurl>authenticate` you will see the frontend to be able to authenticate. Click the button and it'll take you through the Microsoft login flow. Once you've authenticated, you'll be redirected back. If you look in `data/tokens` you'll see a token file. You can send this url to any user in your tenant. They are basically giving you read/write permissions in the test tenant.

## Admin Portal

Go to `http://localhost:3000/admin` to see the admin portal. Here you can seed data and refresh tokens if they expire.