# Honolock Elements Demo

A simple Express application to interact with the Honorlock API and demonstrate the usage of Honorlock Elements.

## Setup

1. Clone this repository
2. Create a `.env` file based on the `.env.example` template
3. Add your Honorlock API credentials to the `.env` file:
   ```
   HONORLOCK_CLIENT_ID=your_client_id
   HONORLOCK_CLIENT_SECRET=your_client_secret
   ```
4. Install dependencies:
   ```
   npm install
   ```
5. Start the application:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Application Flow

1. The application authenticates with the Honorlock API using your client credentials
2. You'll be presented with a list of courses to select from
3. After selecting a course, you'll see a list of users
4. After selecting a user, the application will initialize the Honorlock Elements component with the appropriate token and context

## Notes

- The user token is only valid once. Once used, it's burnt.
- Make sure to unblock 3rd party cookies for the Honorlock Elements component to work properly.
