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
    res.render('student/exam-list', { 
      exams: examsData.data, 
      accessToken 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// Combined extension check and session creation route
router.get('/exam-setup', async (req, res) => {
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

    // Render combined page using EJS template
    res.render('student/exam-setup', {
      externalExamId,
      accessToken,
      studentInfo,
      iframeSrc: extensionCheckData.data.iframe_src
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// Create session data endpoint (for AJAX call)
router.post('/create-session-data', async (req, res) => {
  try {
    const { externalExamId, accessToken, studentInfo } = req.body;
    
    if (!externalExamId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token and external exam ID are required'
      });
    }
    
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
      return res.status(createSessionResponse.status).json({
        success: false,
        error: `Failed to create session: ${createSessionResponse.status}`
      });
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
      return res.status(instructionsResponse.status).json({
        success: false,
        error: `Failed to get exam instructions: ${instructionsResponse.status}`
      });
    }

    const instructionsData = await instructionsResponse.json();
    
    res.json({
      success: true,
      sessionData: sessionData.data,
      instructionsData: instructionsData.data
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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
  
  res.render('student/exam', {
    externalExamId,
    studentId,
    attemptId
  });
});

export default router;
