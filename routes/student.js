import express from 'express';
const router = express.Router();

// Helper function to get access token
const getAccessToken = async () => {
  const tokenResponse = await fetch('https://app.honorlock.com/api/en/v1/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json', // Without Accept application/json, errors from Honorlock API will return 302 redirect instead of JSON
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
  return tokenData.data.access_token;
};

// List exams route
router.get('/', async (req, res) => {
  try {
    // Get access token from Honorlock API
    const accessToken = await getAccessToken();

    // Get exams from Honorlock API
    const examsResponse = await fetch('https://app.honorlock.com/api/en/v1/exams', {
      method: 'GET',
      headers: {
        'Accept': 'application/json', // Without Accept application/json, errors from Honorlock API will return 302 redirect instead of JSON
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!examsResponse.ok) {
      throw new Error(`Failed to get exams: ${examsResponse.status}`);
    }

    const examsData = await examsResponse.json();
    
    // Render exams selection page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Honorlock Exams</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 class="text-2xl font-bold mb-4">Select an Exam</h1>
          <ul class="space-y-2">
            ${examsData.data.map(exam => `
              <li>
                ${exam.external_id ? 
                  `<a href="/student/extension-check?externalExamId=${exam.external_id}&token=${encodeURIComponent(accessToken)}" 
                     class="block p-3 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200">
                    ${exam.name}
                    <div class="text-sm text-gray-600">
                      ${exam.is_scheduled ? `Scheduled: ${new Date(exam.exam_start).toLocaleString()} - ${new Date(exam.exam_end).toLocaleString()}` : 'Not scheduled'}
                    </div>
                  </a>` : 
                  `<div class="block p-3 bg-gray-100 rounded border border-gray-200">
                    ${exam.name}
                    <div class="text-sm text-gray-600">
                      ${exam.is_scheduled ? `Scheduled: ${new Date(exam.exam_start).toLocaleString()} - ${new Date(exam.exam_end).toLocaleString()}` : 'Not scheduled'}
                    </div>
                    <div class="mt-1 text-red-500 text-xs">Cannot proceed: external_id is missing</div>
                  </div>`
                }
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

// Extension check route
router.get('/extension-check', async (req, res) => {
  try {
    const { externalExamId, token: accessToken } = req.query;

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    if (!externalExamId) {
      throw new Error('External Exam ID is required');
    }

    // Check extension
    const extensionCheckResponse = await fetch('https://app.honorlock.com/api/en/v1/extension/check', {
      method: 'GET',
      headers: {
        'Accept': 'application/json', // Without Accept application/json, errors from Honorlock API will return 302 redirect instead of JSON
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!extensionCheckResponse.ok) {
      throw new Error(`Failed to check extension: ${extensionCheckResponse.status}`);
    }

    const extensionCheckData = await extensionCheckResponse.json();
    
    // Render extension check page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Honorlock Extension Check</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script type="module" src="https://unpkg.com/@honorlock/integration-sdk-js?module"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
          <h1 class="text-2xl font-bold mb-4">Honorlock Extension Check</h1>
          <p class="mb-4">Please install the Honorlock extension to continue.</p>
          
          <div class="mb-4">
            <iframe src="${extensionCheckData.data.iframe_src}" width="100%" height="300" frameborder="0"></iframe>
          </div>
          
          <button 
            data-hl-extension-init 
            style="display: none;" 
            class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            onclick="window.location.href='/student/create-session?externalExamId=${externalExamId}&token=${encodeURIComponent(accessToken)}'">
            Continue to Exam
          </button>
        </div>
        
        <script>
          document.addEventListener('DOMContentLoaded', async () => {
            const honorlock = globalThis.Honorlock || window.Honorlock;
            
            try {
              await honorlock.init();
              console.log('Honorlock initialized successfully');
            } catch (error) {
              console.error('Error initializing Honorlock:', error);
            }
            
            honorlock.onExtensionVerified(() => {
              // Show the continue button when extension is verified
              let continueButton = document.querySelector('[data-hl-extension-init]');
              continueButton.style.display = 'block';
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

// Create session route
router.get('/create-session', async (req, res) => {
  try {
    const { externalExamId, token: accessToken } = req.query;

    if (!externalExamId || !accessToken) {
      throw new Error('Access token and external exam ID are required');
    }

    // For demo purposes, we'll use hardcoded student information
    // In a real application, this would come from your authentication system
    const studentInfo = {
      exam_taker_id: "student123",
      exam_taker_email: "student@example.com",
      exam_taker_first_name: "John",
      exam_taker_last_name: "Student",
      external_exam_id: externalExamId,
      exam_taker_attempt_id: "attempt1",
      exam_taker_name_aliases: ["John Student"],
      // Don't add bypass_payment, this gave all kinds of problems
      // bypass_payment: true
    };

    // Create session
    const createSessionResponse = await fetch('https://app.honorlock.com/api/en/v1/exams/sessions/create', {
      method: 'POST',
      headers: {
        'Accept': 'application/json', // Without Accept application/json, errors from Honorlock API will return 302 redirect instead of JSON
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentInfo),
    });

    if (!createSessionResponse.ok) {
      throw new Error(`Failed to create session: ${createSessionResponse.status}`);
    }

    const sessionData = await createSessionResponse.json();

    // Get exam instructions
    const instructionsResponse = await fetch(`https://app.honorlock.com/api/en/v1/exams/${externalExamId}/instructions`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json', // Without Accept application/json, errors from Honorlock API will return 302 redirect instead of JSON
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!instructionsResponse.ok) {
      throw new Error(`Failed to get exam instructions: ${instructionsResponse.status}`);
    }

    const instructionsData = await instructionsResponse.json();
    
    // Render session page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Honorlock Exam Session</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script type="module" src="https://unpkg.com/@honorlock/integration-sdk-js?module"></script>
      </head>
      <body class="bg-gray-100 min-h-screen">
        <div class="p-8">
          <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
            <h1 class="text-2xl font-bold mb-4">Exam Session Setup</h1>
            <p class="mb-4">Please follow the instructions to start your exam.</p>
            
            <div class="mb-6">
              <h2 class="text-lg font-semibold mb-2">Launch Screen</h2>
              <iframe src="${instructionsData.data.launch_screen_url}" width="100%" height="400" frameborder="0"></iframe>
            </div>
            
            <button 
              data-hl-extension-start 
              style="display: none;" 
              class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              id="startExamButton">
              Start Exam
            </button>
          </div>
        </div>
        
        <script>
          document.addEventListener('DOMContentLoaded', async () => {
            const honorlock = globalThis.Honorlock || window.Honorlock;
            const sessionInfo = ${JSON.stringify(sessionData.data)};
            const studentInfo = ${JSON.stringify(studentInfo)};
            
            // Setup session
            honorlock.setupSession({
              session: sessionInfo,
              app_url: window.location.origin,
              external_exam_id: studentInfo.external_exam_id,
              exam_taker_id: studentInfo.exam_taker_id,
              exam_taker_name: studentInfo.exam_taker_full_name,
              exam_taker_attempt_id: studentInfo.exam_taker_attempt_id
            });
            
            // Register callback for when exam can begin
            honorlock.onBeginExam(() => {
              let startButton = document.querySelector('[data-hl-extension-start]');
              startButton.style.display = 'block';
            });
            
            // Handle start exam button click
            document.getElementById('startExamButton').addEventListener('click', async () => {
              try {
                // Verify session authentication
                const verifyResponse = await fetch('/student/verify-session', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    external_exam_id: studentInfo.external_exam_id,
                    exam_taker_id: studentInfo.exam_taker_id,
                    exam_taker_attempt_id: studentInfo.exam_taker_attempt_id,
                    token: '${accessToken}'
                  })
                });
                
                const verifyData = await verifyResponse.json();
                
                if (verifyData.authenticated) {
                  // Start session
                  const startResponse = await fetch('/student/start-session', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      external_exam_id: studentInfo.external_exam_id,
                      exam_taker_id: studentInfo.exam_taker_id,
                      exam_taker_attempt_id: studentInfo.exam_taker_attempt_id,
                      token: '${accessToken}'
                    })
                  });
                  
                  const startData = await startResponse.json();
                  
                  if (startData.success) {
                    // Redirect to exam page (in a real app, this would go to your exam platform)
                    window.location.href = '/student/exam?externalExamId=${externalExamId}&studentId=' + 
                      studentInfo.exam_taker_id + '&attemptId=' + studentInfo.exam_taker_attempt_id;
                  } else {
                    alert('Failed to start session: ' + startData.error);
                  }
                } else {
                  alert('Session authentication failed');
                }
              } catch (error) {
                console.error('Error:', error);
                alert('An error occurred: ' + error.message);
              }
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

// Verify session endpoint
router.post('/verify-session', async (req, res) => {
  try {
    const { external_exam_id, exam_taker_id, exam_taker_attempt_id, token } = req.body;
    
    // Verify exam session authentication
    const verifyResponse = await fetch(
      `https://app.honorlock.com/api/en/v1/exams/${external_exam_id}/sessions/${exam_taker_id}/${exam_taker_attempt_id}/verify`,
      {
        method: 'GET',
        headers: {
        'Accept': 'application/json', // Without Accept application/json, errors from Honorlock API will return 302 redirect instead of JSON
        'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify session: ${verifyResponse.status}`);
    }

    const verifyData = await verifyResponse.json();
    
    res.json({
      authenticated: verifyData.data.authenticated
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      authenticated: false,
      error: error.message
    });
  }
});

// Start session endpoint
router.post('/start-session', async (req, res) => {
  try {
    const { external_exam_id, exam_taker_id, exam_taker_attempt_id, token } = req.body;
    
    // Start session
    const startResponse = await fetch('https://app.honorlock.com/api/en/v1/session/start', {
      method: 'POST',
      headers: {
        'Accept': 'application/json', // Without Accept application/json, errors from Honorlock API will return 302 redirect instead of JSON
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_exam_id,
        exam_taker_id,
        exam_taker_attempt_id
      }),
    });

    if (!startResponse.ok) {
      throw new Error(`Failed to start session: ${startResponse.status}`);
    }

    const startData = await startResponse.json();
    
    res.json({
      success: true,
      data: startData.data
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Exam page (placeholder for actual exam)
router.get('/exam', (req, res) => {
  const { externalExamId, studentId, attemptId } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Exam in Progress</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen p-8">
      <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 class="text-2xl font-bold mb-4">Exam in Progress</h1>
        <p class="mb-4">You are now taking the exam. This is where your actual exam content would appear.</p>
        
        <div class="p-4 bg-blue-50 rounded mb-4">
          <p><strong>External Exam ID:</strong> ${externalExamId}</p>
          <p><strong>Student ID:</strong> ${studentId}</p>
          <p><strong>Attempt ID:</strong> ${attemptId}</p>
        </div>
        
        <div class="border-t pt-4 mt-4">
          <p class="text-gray-600">Honorlock is monitoring this session.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

export default router;
