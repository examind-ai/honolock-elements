import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup Express
const app = express();
const port = process.env.PORT || 3000;

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// Routes
app.get('/', async (req, res) => {
  try {
    // Get access token from Honorlock API
    const tokenResponse = await fetch('https://app.honorlock.com/api/en/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.HONORLOCK_CLIENT_ID,
        client_secret: process.env.HONORLOCK_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.data.access_token;

    // Get courses from Honorlock API
    const coursesResponse = await fetch('https://app.honorlock.com/api/en/v1/courses', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!coursesResponse.ok) {
      throw new Error(`Failed to get courses: ${coursesResponse.status}`);
    }

    const coursesData = await coursesResponse.json();
    
    // Render courses selection page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Honorlock Courses</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 class="text-2xl font-bold mb-4">Select a Course</h1>
          <ul class="space-y-2">
            ${coursesData.data.map(course => `
              <li>
                <a href="/courses/${course.uuid}?token=${encodeURIComponent(accessToken)}" 
                   class="block p-3 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200">
                  ${course.name} (${course.crn || 'No CRN'})
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 class="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p>${error.message}</p>
          <p class="mt-4">Make sure you have set up your .env file with valid credentials.</p>
        </div>
      </body>
      </html>
    `);
  }
});

app.get('/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const accessToken = req.query.token;

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    // Get users from Honorlock API
    const usersResponse = await fetch('https://app.honorlock.com/api/en/v1/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!usersResponse.ok) {
      throw new Error(`Failed to get users: ${usersResponse.status}`);
    }

    const usersData = await usersResponse.json();
    
    // Render users selection page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Honorlock Users</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 class="text-2xl font-bold mb-4">Select a User</h1>
          <ul class="space-y-2">
            ${usersData.data.map(user => `
              <li>
                <a href="/courses/${courseId}/users/${user.uuid}?token=${encodeURIComponent(accessToken)}" 
                   class="block p-3 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200">
                  ${user.first_name} ${user.last_name} (${user.email})
                  <div class="text-sm text-gray-600">Roles: ${user.roles.join(', ')}</div>
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/courses/:courseId/users/:userId', async (req, res) => {
  try {
    const { courseId, userId } = req.params;
    const accessToken = req.query.token;

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    // Get user token from Honorlock API
    const userTokenResponse = await fetch('https://app.honorlock.com/api/en/v1/user-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        user_uuid: userId,
      }),
    });

    if (!userTokenResponse.ok) {
      throw new Error(`Failed to get user token: ${userTokenResponse.status}`);
    }

    const userTokenData = await userTokenResponse.json();
    const userAccessToken = userTokenData.data.access_token;
    
    // Render the final page with Honorlock Elements
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Honorlock Elements</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 min-h-screen">
        <script type="module" src="https://unpkg.com/@honorlock/elements"></script>

        <div class="p-8">
          <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
            <h1 class="text-2xl font-bold mb-4">Honorlock Elements Demo</h1>
            <p class="mb-4">The Honorlock Elements component is loaded below.</p>
            <p class="text-sm text-gray-600 mb-2">Course ID: ${courseId}</p>
            <p class="text-sm text-gray-600">User ID: ${userId}</p>
          </div>
        </div>

        <honorlock-elements></honorlock-elements>

        <script>
        document.addEventListener('HonorlockElements', () => {
          console.log("HonorlockElements", HonorlockElements);
          window.HonorlockElements.init({
            // User instructor access token from POST https://app.honorlock.com/api/en/v1/user-tokens
            // using user_uuid of a user with role Instructor*
            // IMPORTANT: This token is only valid once. Once used, it's burnt.
            // Also, make sure to unblock 3rd party cookies in order for this to work.
            token: '${userAccessToken}',
            debug: true,
            context: {
              type: 'course',
              id: '${courseId}',
            },
          });
        });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
