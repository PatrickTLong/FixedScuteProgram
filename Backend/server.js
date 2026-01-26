require('dotenv').config();
const express = require('express');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for backend
const supabase = createClient(supabaseUrl, supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase credentials in .env file');
  console.error('Please add SUPABASE_URL and SUPABASE_SERVICE_KEY to your .env file');
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '30d'; // Tokens expire in 30 days

if (!JWT_SECRET) {
  console.error('ERROR: Missing JWT_SECRET in .env file');
  console.error('Please add JWT_SECRET to your .env file');
}

// Generate JWT token for a user
function generateToken(email) {
  return jwt.sign({ email: email.toLowerCase() }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token and extract email
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, email: decoded.email };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Authentication middleware - protects routes that require login
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const result = verifyToken(token);
  if (!result.valid) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  // Attach authenticated email to request
  req.userEmail = result.email;
  next();
}

app.use(cors());
app.use(express.json());

// GET /delete-account - Public page for account deletion instructions (for Google Play)
app.get('/delete-account', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delete Your Scute Account</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #f5f5f5;
          color: #333;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #1a1a1a; margin-bottom: 24px; }
        h2 { color: #333; margin-top: 32px; }
        p { line-height: 1.6; color: #555; }
        ol { padding-left: 20px; }
        li { margin: 12px 0; line-height: 1.6; }
        .highlight { background: #f0f7ff; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .warning { background: #fff3e0; padding: 16px; border-radius: 8px; margin: 20px 0; }
        a { color: #007AFF; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Delete Your Scute Account</h1>

        <p>We're sorry to see you go. You can delete your Scute account and all associated data directly from the app.</p>

        <h2>How to Delete Your Account</h2>
        <ol>
          <li>Open the <strong>Scute</strong> app on your device</li>
          <li>Go to <strong>Settings</strong> (gear icon)</li>
          <li>Scroll down to the <strong>Account</strong> section</li>
          <li>Tap <strong>"Delete Account"</strong></li>
          <li>Confirm the deletion when prompted</li>
        </ol>

        <div class="highlight">
          <strong>What gets deleted:</strong>
          <ul>
            <li>Your account and login credentials</li>
            <li>All presets and blocking configurations</li>
            <li>Your membership and subscription data</li>
            <li>All personal information stored on our servers</li>
          </ul>
        </div>

        <div class="warning">
          <strong>Please note:</strong> Account deletion is permanent and cannot be undone. If you have an active subscription, please cancel it through Google Play before deleting your account.
        </div>

        <h2>Need Help?</h2>
        <p>If you're unable to access the app or need assistance, please contact us at <a href="mailto:support@scuteapp.com">support@scuteapp.com</a> with your registered email address, and we'll process your deletion request within 30 days.</p>
      </div>
    </body>
    </html>
  `);
});

// GET /privacy-policy - Public privacy policy page (for Google Play)
app.get('/privacy-policy', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Privacy Policy - Scute</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 700px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #1a1a1a; margin-bottom: 8px; }
        h2 { color: #333; margin-top: 28px; margin-bottom: 12px; font-size: 1.1em; }
        p { color: #555; margin-bottom: 16px; }
        .effective-date { color: #888; font-size: 0.9em; margin-bottom: 24px; }
        ul { padding-left: 20px; color: #555; }
        li { margin: 8px 0; }
        a { color: #007AFF; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Privacy Policy</h1>
        <p class="effective-date">Effective Date: January 6, 2026</p>

        <p>Thank you for using Scute. Your privacy is important to us, and this Privacy Policy explains how we collect, use, and protect your information when you use our mobile application.</p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul>
          <li><strong>Email Address:</strong> Collected during account registration to identify your account.</li>
          <li><strong>App Usage Data:</strong> We access app usage statistics on your device to track screen time and enforce app-blocking features. This data is processed locally on your device and is not transmitted to our servers.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information for the following purposes:</p>
        <ul>
          <li>To create and manage your account.</li>
          <li>To enable core app functionality, such as app blocking and screen time tracking.</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <ul>
          <li>Your email address is stored securely in our cloud database (powered by Supabase).</li>
          <li>App usage data is stored locally on your device and is not uploaded to our servers.</li>
          <li>We use industry-standard encryption to protect data in transit and at rest.</li>
        </ul>

        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Supabase:</strong> For secure cloud storage and authentication.</li>
          <li><strong>Google Play:</strong> For processing subscription and one-time payments. We do not store your payment information (credit card details, billing address, etc.). All payment processing is handled securely by Google Play. We only receive confirmation of your subscription status.</li>
        </ul>
        <p>These services have their own privacy policies, and we encourage you to review them.</p>

        <h2>5. Permissions</h2>
        <p>To provide our services, the app requires the following permissions:</p>
        <ul>
          <li><strong>Usage Access:</strong> To monitor and block apps on your device.</li>
          <li><strong>Display Over Other Apps:</strong> To show blocking overlays.</li>
          <li><strong>Accessibility Services:</strong> To enforce app-blocking functionality.</li>
        </ul>
        <p>These permissions are used solely for the app's intended functionality.</p>

        <h2>6. Data Sharing</h2>
        <p>We do not sell, rent, or share your personal information with third parties, except:</p>
        <ul>
          <li>When required by law.</li>
          <li>To protect the rights, safety, or property of Scute or its users.</li>
        </ul>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access, update, or delete your account information.</li>
          <li>Revoke app permissions at any time through your device settings.</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:info@scuteapp.com">info@scuteapp.com</a>.</p>

        <h2>8. Children's Privacy</h2>
        <p>Scute is not intended for children under the age of 13. We do not knowingly collect personal information from children.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Any changes will be posted in the app, and the "Effective Date" will be updated accordingly.</p>

        <h2>10. Contact Us</h2>
        <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
        <p>Email: <a href="mailto:info@scuteapp.com">info@scuteapp.com</a></p>
      </div>
    </body>
    </html>
  `);
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/send-code - Send verification code (signup only)
app.post('/api/send-code', async (req, res) => {
  const { email } = req.body;
  console.log('[send-code] Request received');

  if (!email || !email.includes('@')) {
    console.log('[send-code] Validation failed: Invalid email format');
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing codes for this email
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', normalizedEmail);

    // Store new code
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
      return res.status(500).json({ error: 'Failed to generate verification code' });
    }

    // Send email via SendGrid
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'Your Scute Verification Code',
      text: `Your verification code is: ${code}. This code expires in 10 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 40px 40px 30px 40px; text-align: center;">
                      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Scute</h1>
                      <p style="margin: 0; font-size: 14px; color: #666666;">Verification Code</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                        Enter this code to verify your email address:
                      </p>
                      <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 0 0 24px 0;">
                        <span style="font-size: 32px; font-weight: 600; letter-spacing: 6px; color: #1a1a1a;">${code}</span>
                      </div>
                      <p style="margin: 0; font-size: 13px; color: #888888;">
                        This code expires in 10 minutes.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid #eeeeee; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        If you didn't request this code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    console.log(`Code sent to ${email}: ${code}`);
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('SendGrid error:', error);
    if (error.response) {
      console.error('Error body:', error.response.body);
    }
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /api/verify-and-register - Verify code and create account with password
app.post('/api/verify-and-register', async (req, res) => {
  const { email, code, password } = req.body;
  console.log('[verify-and-register] Request received');

  if (!email || !code || !password) {
    console.log('[verify-and-register] Validation failed: Missing required fields');
    return res.status(400).json({ error: 'Email, code, and password required' });
  }

  if (password.length < 6) {
    console.log('[verify-and-register] Validation failed: Password too short');
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Get stored verification code
    const { data: storedCode, error: fetchError } = await supabase
      .from('verification_codes')
      .select('code, expires_at')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !storedCode) {
      return res.status(400).json({ error: 'No verification code found' });
    }

    if (new Date() > new Date(storedCode.expires_at)) {
      // Delete expired code
      await supabase.from('verification_codes').delete().eq('email', normalizedEmail);
      return res.status(400).json({ error: 'Code expired' });
    }

    if (storedCode.code !== code) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const { error: userError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash: hashedPassword,
        verified: true,
      });

    if (userError) {
      console.error('Error creating user:', userError);
      if (userError.message.includes('duplicate')) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Create user_cards entry for this user with 7-day trial
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const { error: cardError } = await supabase
      .from('user_cards')
      .insert({
        email: normalizedEmail,
        settings: null,
        is_member: false,
        trial_end: trialEnd.toISOString(),
      });

    if (cardError && !cardError.message.includes('duplicate')) {
      console.error('Error creating user_cards entry:', cardError);
    }

    // Create default presets for the new user
    await createDefaultPresetsForUser(normalizedEmail);

    // Delete verification code
    await supabase.from('verification_codes').delete().eq('email', normalizedEmail);

    // Generate JWT token for authenticated session
    const token = generateToken(normalizedEmail);

    console.log(`User registered: ${email}`);
    res.json({ success: true, message: 'Account created successfully', token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/google-auth - Authenticate with Google
app.post('/api/google-auth', async (req, res) => {
  const { idToken, email, name } = req.body;
  console.log('[google-auth] Request received for email:', email);

  if (!idToken || !email) {
    console.log('[google-auth] Validation failed: Missing idToken or email');
    return res.status(400).json({ error: 'Google ID token and email required' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Verify the Google ID token
    // In production, you should verify the token with Google's servers
    // For now, we trust the token from the official Google Sign-In SDK
    // The SDK already verifies the token on the client side

    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    if (!existingUser) {
      // Create new user account for Google sign-in
      // No password needed for Google users
      const { error: createError } = await supabase
        .from('users')
        .insert({
          email: normalizedEmail,
          password_hash: null, // Google users don't have a password
          verified: true, // Google already verified the email
          google_user: true, // Mark as Google user
        });

      if (createError) {
        console.error('Error creating Google user:', createError);
        if (createError.message.includes('duplicate')) {
          // User was created between our check and insert, proceed normally
        } else {
          return res.status(500).json({ error: 'Failed to create account' });
        }
      }

      console.log(`New Google user created: ${normalizedEmail}`);
    }

    // Ensure user_cards entry exists
    const { data: existingCard } = await supabase
      .from('user_cards')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    if (!existingCard) {
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      await supabase
        .from('user_cards')
        .insert({
          email: normalizedEmail,
          settings: null,
          is_member: false,
          trial_end: trialEnd.toISOString(),
        });
      console.log(`Created user_cards entry for Google user: ${normalizedEmail}`);

      // Create default presets for the new Google user
      await createDefaultPresetsForUser(normalizedEmail);
    }

    // Generate JWT token for authenticated session
    const token = generateToken(normalizedEmail);

    console.log(`Google sign-in successful: ${normalizedEmail}`);
    res.json({ success: true, token });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /api/signin - Sign in with email and password
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;
  console.log('[signin] Request received');

  if (!email || !password) {
    console.log('[signin] Validation failed: Missing email or password');
    return res.status(400).json({ error: 'Email and password required' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('email', normalizedEmail)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has a password (OAuth users won't have one)
    if (!user.password_hash) {
      return res.status(400).json({ error: 'This account uses Google Sign-In. Please use the Google Sign-In button instead.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Password correct, send verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing codes
    await supabase.from('verification_codes').delete().eq('email', normalizedEmail);

    // Store new code
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
      return res.status(500).json({ error: 'Failed to generate verification code' });
    }

    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'Your Scute Sign In Code',
      text: `Your sign in code is: ${code}. This code expires in 10 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 40px 40px 30px 40px; text-align: center;">
                      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Scute</h1>
                      <p style="margin: 0; font-size: 14px; color: #666666;">Sign In Code</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                        Enter this code to sign in to your account:
                      </p>
                      <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 0 0 24px 0;">
                        <span style="font-size: 32px; font-weight: 600; letter-spacing: 6px; color: #1a1a1a;">${code}</span>
                      </div>
                      <p style="margin: 0; font-size: 13px; color: #888888;">
                        This code expires in 10 minutes.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid #eeeeee; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        If you didn't request this code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    console.log(`Sign-in code sent to ${email}: ${code}`);
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /api/verify-signin - Verify sign-in code
app.post('/api/verify-signin', async (req, res) => {
  const { email, code } = req.body;
  console.log('[verify-signin] Request received');

  if (!email || !code) {
    console.log('[verify-signin] Validation failed: Missing email or code');
    return res.status(400).json({ error: 'Email and code required' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Get stored code
    const { data: storedCode, error: fetchError } = await supabase
      .from('verification_codes')
      .select('code, expires_at')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !storedCode) {
      return res.status(400).json({ error: 'No verification code found' });
    }

    if (new Date() > new Date(storedCode.expires_at)) {
      await supabase.from('verification_codes').delete().eq('email', normalizedEmail);
      return res.status(400).json({ error: 'Code expired' });
    }

    if (storedCode.code !== code) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Ensure user_cards entry exists (for users who registered before this was added)
    const { data: existingCard } = await supabase
      .from('user_cards')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    if (!existingCard) {
      await supabase
        .from('user_cards')
        .insert({
          email: normalizedEmail,
          settings: null,
        });
      console.log(`Created missing user_cards entry for: ${normalizedEmail}`);
    }

    // Delete verification code
    await supabase.from('verification_codes').delete().eq('email', normalizedEmail);

    // Generate JWT token for authenticated session
    const token = generateToken(normalizedEmail);

    console.log(`User signed in: ${email}`);
    res.json({ success: true, message: 'Sign in successful', token });
  } catch (error) {
    console.error('Verify sign-in error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/save-settings - Save user settings (PROTECTED)
app.post('/api/save-settings', authenticateToken, async (req, res) => {
  const { settings } = req.body;
  const normalizedEmail = req.userEmail; // Get email from verified token
  console.log('[save-settings] Request received for user:', normalizedEmail);

  if (!settings) {
    console.log('[save-settings] Validation failed: No settings provided');
    return res.status(400).json({ error: 'Settings required' });
  }

  try {
    // Check if user_cards row exists
    const { data: existingUserCard } = await supabase
      .from('user_cards')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    let error;
    if (existingUserCard) {
      // Update existing row
      const result = await supabase
        .from('user_cards')
        .update({ settings })
        .eq('email', normalizedEmail);
      error = result.error;
    } else {
      // Insert new row
      const result = await supabase
        .from('user_cards')
        .insert({
          email: normalizedEmail,
          settings: settings,
        });
      error = result.error;
    }

    if (error) {
      console.error('Error saving settings:', error);
      return res.status(500).json({ error: 'Failed to save settings' });
    }

    console.log(`Settings saved for: ${normalizedEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});


// POST /api/reset-password-request - Request password reset code
app.post('/api/reset-password-request', async (req, res) => {
  const { email } = req.body;
  console.log('[reset-password-request] Request received');

  if (!email || !email.includes('@')) {
    console.log('[reset-password-request] Validation failed: Invalid email format');
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Generate reset code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing codes for this email
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', normalizedEmail);

    // Store new code
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (codeError) {
      console.error('Error storing reset code:', codeError);
      return res.status(500).json({ error: 'Failed to generate reset code' });
    }

    // Send email via SendGrid
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'Reset Your Scute Password',
      text: `Your password reset code is: ${code}. This code expires in 10 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 40px 40px 30px 40px; text-align: center;">
                      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Scute</h1>
                      <p style="margin: 0; font-size: 14px; color: #666666;">Password Reset</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                        Enter this code to reset your password:
                      </p>
                      <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 0 0 24px 0;">
                        <span style="font-size: 32px; font-weight: 600; letter-spacing: 6px; color: #1a1a1a;">${code}</span>
                      </div>
                      <p style="margin: 0; font-size: 13px; color: #888888;">
                        This code expires in 10 minutes.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid #eeeeee; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        If you didn't request this code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    console.log(`Password reset code sent to ${email}: ${code}`);
    res.json({ success: true, message: 'Reset code sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// POST /api/reset-password - Reset password with code
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  console.log('[reset-password] Request received');

  if (!email || !code || !newPassword) {
    console.log('[reset-password] Validation failed: Missing required fields');
    return res.status(400).json({ error: 'Email, code, and new password required' });
  }

  if (newPassword.length < 6) {
    console.log('[reset-password] Validation failed: Password too short');
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Get stored verification code
    const { data: storedCode, error: fetchError } = await supabase
      .from('verification_codes')
      .select('code, expires_at')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !storedCode) {
      return res.status(400).json({ error: 'No reset code found' });
    }

    if (new Date() > new Date(storedCode.expires_at)) {
      await supabase.from('verification_codes').delete().eq('email', normalizedEmail);
      return res.status(400).json({ error: 'Code expired' });
    }

    if (storedCode.code !== code) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', normalizedEmail);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // Delete verification code
    await supabase.from('verification_codes').delete().eq('email', normalizedEmail);

    console.log(`Password reset for: ${email}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/delete-account - Delete user account completely (PROTECTED)
// Deletes all user data: presets, user_cards, users table entries
// Does NOT delete from valid_scute_uids (whitelist) - the Scute card remains valid for future registration
app.post('/api/delete-account', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    // 1. Delete all user presets
    const { error: presetsError } = await supabase
      .from('user_presets')
      .delete()
      .eq('email', normalizedEmail);

    if (presetsError) {
      console.error('Error deleting user_presets:', presetsError);
    }

    // 2. Delete from user_cards (this clears uid, settings but NOT the whitelist)
    const { error: cardError } = await supabase
      .from('user_cards')
      .delete()
      .eq('email', normalizedEmail);

    if (cardError) {
      console.error('Error deleting user_cards:', cardError);
    }

    // 3. Delete from users table
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('email', normalizedEmail);

    if (userError) {
      console.error('Error deleting user:', userError);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    // 4. Delete any pending verification codes
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', normalizedEmail);

    console.log(`Account deleted (all data removed): ${normalizedEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ============ PRESET ENDPOINTS ============

// GET /api/presets - Get all presets for a user (PROTECTED)
app.get('/api/presets', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    const { data, error } = await supabase
      .from('user_presets')
      .select('*')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching presets:', error);
      return res.status(500).json({ error: 'Failed to fetch presets' });
    }

    // Transform to frontend format
    const presets = (data || []).map(p => ({
      id: p.preset_id,
      name: p.name,
      mode: p.mode,
      selectedApps: p.selected_apps || [],
      blockedWebsites: p.blocked_websites || [],
      timerDays: p.timer_days,
      timerHours: p.timer_hours,
      timerMinutes: p.timer_minutes,
      timerSeconds: p.timer_seconds || 0,
      noTimeLimit: p.no_time_limit,
      blockSettings: p.block_settings,
      isActive: p.is_active,
      isDefault: p.is_default,
      targetDate: p.target_date || null,
      // Emergency tapout feature (per-preset toggle)
      allowEmergencyTapout: p.allow_emergency_tapout || false,
      // Scheduling feature
      isScheduled: p.is_scheduled || false,
      scheduleStartDate: p.schedule_start_date || null,
      scheduleEndDate: p.schedule_end_date || null,
      // Recurring schedule feature
      repeat_enabled: p.repeat_enabled || false,
      repeat_unit: p.repeat_unit || null,
      repeat_interval: p.repeat_interval || null,
      // Strict mode - when enabled, preset is locked until timer ends or emergency tapout
      // When disabled, slide-to-unlock is available
      strictMode: p.strict_mode ?? false, // Default to false (slide-to-unlock available)
    }));

    console.log('[presets:get] Returning', presets.length, 'presets for user:', normalizedEmail);
    presets.forEach(p => {
      console.log(`[presets:get]   - ${p.name}: strictMode=${p.strictMode}, allowEmergencyTapout=${p.allowEmergencyTapout}, noTimeLimit=${p.noTimeLimit}`);
    });

    res.json({ presets });
  } catch (error) {
    console.error('Get presets error:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// POST /api/presets - Create or update a preset (PROTECTED)
app.post('/api/presets', authenticateToken, async (req, res) => {
  const { preset } = req.body;
  const normalizedEmail = req.userEmail; // Get email from verified token
  console.log('[presets:save] Request received for user:', normalizedEmail);

  if (!preset) {
    console.log('[presets:save] Validation failed: No preset provided');
    return res.status(400).json({ error: 'Preset required' });
  }

  try {
    // Check if preset already exists
    const { data: existing } = await supabase
      .from('user_presets')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('preset_id', preset.id)
      .single();

    const presetData = {
      email: normalizedEmail,
      preset_id: preset.id,
      name: preset.name,
      mode: preset.mode || 'specific',
      selected_apps: preset.selectedApps || [],
      blocked_websites: preset.blockedWebsites || [],
      timer_days: preset.timerDays || 0,
      timer_hours: preset.timerHours || 0,
      timer_minutes: preset.timerMinutes || 0,
      timer_seconds: preset.timerSeconds || 0,
      no_time_limit: preset.noTimeLimit ?? true,
      block_settings: preset.blockSettings || false,
      is_active: preset.isActive || false,
      is_default: preset.isDefault || false,
      target_date: preset.targetDate || null,
      // Emergency tapout feature (per-preset toggle)
      allow_emergency_tapout: preset.allowEmergencyTapout || false,
      // Scheduling feature
      is_scheduled: preset.isScheduled || false,
      schedule_start_date: preset.scheduleStartDate || null,
      schedule_end_date: preset.scheduleEndDate || null,
      // Recurring schedule feature
      repeat_enabled: preset.repeat_enabled || false,
      repeat_unit: preset.repeat_unit || null,
      repeat_interval: preset.repeat_interval || null,
      // Strict mode - when enabled, preset is locked until timer ends or emergency tapout
      strict_mode: preset.strictMode ?? false, // Default to false (slide-to-unlock available)
    };

    console.log('[presets:save] Preset data:', {
      name: preset.name,
      strictMode: preset.strictMode,
      strict_mode_to_save: presetData.strict_mode,
      allowEmergencyTapout: preset.allowEmergencyTapout,
      noTimeLimit: preset.noTimeLimit,
      repeat_enabled: preset.repeat_enabled,
      repeat_unit: preset.repeat_unit,
      repeat_interval: preset.repeat_interval,
    });

    let error;
    if (existing) {
      // Update existing preset
      const result = await supabase
        .from('user_presets')
        .update(presetData)
        .eq('email', normalizedEmail)
        .eq('preset_id', preset.id);
      error = result.error;
    } else {
      // Insert new preset
      const result = await supabase
        .from('user_presets')
        .insert(presetData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving preset:', error);
      return res.status(500).json({ error: 'Failed to save preset' });
    }

    console.log(`Preset saved: ${preset.name} for ${normalizedEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Save preset error:', error);
    res.status(500).json({ error: 'Failed to save preset' });
  }
});

// POST /api/presets/update-schedule - Update schedule dates for recurring presets (PROTECTED)
// Called by Android when a recurring preset ends to set the next occurrence
app.post('/api/presets/update-schedule', authenticateToken, async (req, res) => {
  const { presetId, scheduleStartDate, scheduleEndDate } = req.body;
  const normalizedEmail = req.userEmail;

  console.log('[presets:update-schedule] ========== RECURRING PRESET UPDATE ==========');
  console.log('[presets:update-schedule] Request received:');
  console.log('[presets:update-schedule]   User email:', normalizedEmail);
  console.log('[presets:update-schedule]   Preset ID:', presetId);
  console.log('[presets:update-schedule]   New start date:', scheduleStartDate);
  console.log('[presets:update-schedule]   New end date:', scheduleEndDate);

  if (!presetId || !scheduleStartDate || !scheduleEndDate) {
    console.log('[presets:update-schedule] ERROR: Missing required fields');
    console.log('[presets:update-schedule]   presetId present:', !!presetId);
    console.log('[presets:update-schedule]   scheduleStartDate present:', !!scheduleStartDate);
    console.log('[presets:update-schedule]   scheduleEndDate present:', !!scheduleEndDate);
    return res.status(400).json({ error: 'presetId, scheduleStartDate, and scheduleEndDate required' });
  }

  try {
    console.log('[presets:update-schedule] Updating Supabase...');
    const { data, error } = await supabase
      .from('user_presets')
      .update({
        schedule_start_date: scheduleStartDate,
        schedule_end_date: scheduleEndDate,
      })
      .eq('email', normalizedEmail)
      .eq('preset_id', presetId)
      .select();

    if (error) {
      console.error('[presets:update-schedule] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }

    console.log('[presets:update-schedule] SUCCESS! Updated rows:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('[presets:update-schedule] Updated preset data:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('[presets:update-schedule] WARNING: No rows were updated. Check if preset_id and email match.');
    }
    console.log('[presets:update-schedule] ========== UPDATE COMPLETE ==========');

    res.json({ success: true, updated: data?.length || 0 });
  } catch (error) {
    console.error('[presets:update-schedule] Exception:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/presets - Delete a preset (PROTECTED)
app.delete('/api/presets', authenticateToken, async (req, res) => {
  const { presetId } = req.body;
  const normalizedEmail = req.userEmail; // Get email from verified token
  console.log('[presets:delete] Request received for user:', normalizedEmail, 'presetId:', presetId);

  if (!presetId) {
    console.log('[presets:delete] Validation failed: No presetId provided');
    return res.status(400).json({ error: 'PresetId required' });
  }

  try {
    const { error } = await supabase
      .from('user_presets')
      .delete()
      .eq('email', normalizedEmail)
      .eq('preset_id', presetId);

    if (error) {
      console.error('Error deleting preset:', error);
      return res.status(500).json({ error: 'Failed to delete preset' });
    }

    console.log(`Preset deleted: ${presetId} for ${normalizedEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// POST /api/presets/activate - Activate a non-scheduled preset (PROTECTED)
app.post('/api/presets/activate', authenticateToken, async (req, res) => {
  const { presetId } = req.body;
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    // Only deactivate NON-SCHEDULED presets for this user
    // Scheduled presets manage their own is_active state independently
    await supabase
      .from('user_presets')
      .update({ is_active: false })
      .eq('email', normalizedEmail)
      .or('is_scheduled.is.null,is_scheduled.eq.false');

    // If presetId is provided, activate that preset
    if (presetId) {
      const { error } = await supabase
        .from('user_presets')
        .update({ is_active: true })
        .eq('email', normalizedEmail)
        .eq('preset_id', presetId);

      if (error) {
        console.error('Error activating preset:', error);
        return res.status(500).json({ error: 'Failed to activate preset' });
      }

      // Get the preset data to save to user_cards settings
      const { data: preset } = await supabase
        .from('user_presets')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('preset_id', presetId)
        .single();

      if (preset) {
        // Save preset settings to user_cards
        const settings = {
          mode: preset.mode,
          selectedApps: preset.selected_apps || [],
          blockedWebsites: preset.blocked_websites || [],
          timerDays: preset.timer_days,
          timerHours: preset.timer_hours,
          timerMinutes: preset.timer_minutes,
          timerSeconds: preset.timer_seconds || 0,
          blockSettings: preset.block_settings,
          noTimeLimit: preset.no_time_limit,
          targetDate: preset.target_date || null,
          // Emergency tapout feature (per-preset toggle)
          allowEmergencyTapout: preset.allow_emergency_tapout || false,
          // Scheduling feature
          isScheduled: preset.is_scheduled || false,
          scheduleStartDate: preset.schedule_start_date || null,
          scheduleEndDate: preset.schedule_end_date || null,
        };

        await supabase
          .from('user_cards')
          .update({ settings })
          .eq('email', normalizedEmail);

        console.log(`Preset activated and settings saved: ${presetId} for ${normalizedEmail}`);
      }
    } else {
      // Clear settings when deactivating all presets
      await supabase
        .from('user_cards')
        .update({ settings: null })
        .eq('email', normalizedEmail);

      console.log(`All presets deactivated for ${normalizedEmail}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Activate preset error:', error);
    res.status(500).json({ error: 'Failed to activate preset' });
  }
});

// POST /api/presets/init-defaults - Initialize default presets for a user (PROTECTED)
app.post('/api/presets/init-defaults', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    // Check if user already has presets
    const { data: existing } = await supabase
      .from('user_presets')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1);

    // No default presets - users start with empty preset list
    console.log(`User ${normalizedEmail} checked for presets (no defaults created)`);
    res.json({ success: true, message: 'No default presets created' });
  } catch (error) {
    console.error('Init defaults error:', error);
    res.status(500).json({ error: 'Failed to initialize presets' });
  }
});

// POST /api/presets/deactivate-all - Deactivate all active presets for a user (used on logout) (PROTECTED)
app.post('/api/presets/deactivate-all', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail;

  try {
    const { error } = await supabase
      .from('user_presets')
      .update({ is_active: false })
      .eq('email', normalizedEmail)
      .eq('is_active', true);

    if (error) {
      console.error('Error deactivating presets:', error);
      return res.status(500).json({ error: 'Failed to deactivate presets' });
    }

    console.log(`All active presets deactivated for ${normalizedEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Deactivate all presets error:', error);
    res.status(500).json({ error: 'Failed to deactivate presets' });
  }
});

// POST /api/presets/reset - Delete all presets and recreate defaults (PROTECTED)
app.post('/api/presets/reset', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    // Delete all existing presets for this user
    const { error: deleteError } = await supabase
      .from('user_presets')
      .delete()
      .eq('email', normalizedEmail);

    if (deleteError) {
      console.error('Error deleting presets:', deleteError);
      return res.status(500).json({ error: 'Failed to delete presets' });
    }

    // No default presets recreated - user starts fresh with empty preset list
    console.log(`Presets reset for ${normalizedEmail} (no defaults created)`);
    res.json({ success: true });
  } catch (error) {
    console.error('Reset presets error:', error);
    res.status(500).json({ error: 'Failed to reset presets' });
  }
});

// ============ LOCK STATUS ENDPOINTS ============

// POST /api/lock-status - Update user's lock status (PROTECTED)
app.post('/api/lock-status', authenticateToken, async (req, res) => {
  const { isLocked, lockEndsAt } = req.body;
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    const updateData = {
      is_locked: isLocked,
    };

    if (isLocked) {
      updateData.lock_started_at = new Date().toISOString();
      updateData.lock_ends_at = lockEndsAt || null;
    } else {
      updateData.lock_started_at = null;
      updateData.lock_ends_at = null;
    }

    const { error } = await supabase
      .from('user_cards')
      .update(updateData)
      .eq('email', normalizedEmail);

    if (error) {
      console.error('Error updating lock status:', error);
      return res.status(500).json({ error: 'Failed to update lock status' });
    }

    console.log(`Lock status updated for ${normalizedEmail}: isLocked=${isLocked}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Lock status error:', error);
    res.status(500).json({ error: 'Failed to update lock status' });
  }
});

// GET /api/lock-status - Get user's lock status (PROTECTED)
app.get('/api/lock-status', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select('is_locked, lock_started_at, lock_ends_at')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      return res.json({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
    }

    res.json({
      isLocked: data.is_locked || false,
      lockStartedAt: data.lock_started_at,
      lockEndsAt: data.lock_ends_at,
    });
  } catch (error) {
    console.error('Get lock status error:', error);
    res.status(500).json({ error: 'Failed to get lock status' });
  }
});

// GET /api/emergency-tapout - Get user's emergency tapout status (PROTECTED)
// Gradual refill system: +1 tapout every 2 weeks until back to 3
app.get('/api/emergency-tapout', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select('emergency_tapout_remaining, emergency_tapout_next_refill')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      return res.json({
        remaining: 3,
        nextRefillDate: null,
      });
    }

    const now = new Date();
    let remaining = data.emergency_tapout_remaining ?? 3;
    let nextRefillDate = data.emergency_tapout_next_refill ? new Date(data.emergency_tapout_next_refill) : null;

    // Check if a refill is due
    if (remaining < 3 && nextRefillDate && now >= nextRefillDate) {
      // Grant one tapout
      remaining = Math.min(remaining + 1, 3);

      // If still below 3, schedule next refill in 2 weeks
      // If at 3, clear the refill date
      if (remaining < 3) {
        nextRefillDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks from now
      } else {
        nextRefillDate = null;
      }

      // Update database
      await supabase
        .from('user_cards')
        .update({
          emergency_tapout_remaining: remaining,
          emergency_tapout_next_refill: nextRefillDate ? nextRefillDate.toISOString() : null,
        })
        .eq('email', normalizedEmail);
    }

    res.json({
      remaining: remaining,
      nextRefillDate: nextRefillDate ? nextRefillDate.toISOString() : null,
    });
  } catch (error) {
    console.error('Get emergency tapout error:', error);
    res.status(500).json({ error: 'Failed to get emergency tapout status' });
  }
});

// GET /api/membership-status - Get user's membership and trial status (PROTECTED)
app.get('/api/membership-status', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail;

  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select('is_member, trial_end')
      .eq('email', normalizedEmail)
      .single();

    console.log('[membership-status] Email:', normalizedEmail);
    console.log('[membership-status] DB data:', data);
    console.log('[membership-status] DB error:', error);

    if (error || !data) {
      // Default: not a member, no trial (will force membership modal)
      console.log('[membership-status] No data found, returning expired');
      return res.json({
        isMember: false,
        trialEnd: null,
        trialExpired: true,
      });
    }

    const now = new Date();
    const isMember = data.is_member || false;
    const trialEnd = data.trial_end ? new Date(data.trial_end) : null;
    const trialExpired = !isMember && (!trialEnd || now >= trialEnd);

    console.log('[membership-status] now:', now.toISOString());
    console.log('[membership-status] trialEnd:', trialEnd ? trialEnd.toISOString() : null);
    console.log('[membership-status] isMember:', isMember);
    console.log('[membership-status] trialExpired:', trialExpired);
    console.log('[membership-status] now >= trialEnd:', trialEnd ? now >= trialEnd : 'N/A');

    res.json({
      isMember,
      trialEnd: trialEnd ? trialEnd.toISOString() : null,
      trialExpired,
    });
  } catch (error) {
    console.error('Get membership status error:', error);
    res.status(500).json({ error: 'Failed to get membership status' });
  }
});

// POST /api/emergency-tapout/toggle - Enable/disable emergency tapout (PROTECTED)
app.post('/api/emergency-tapout/toggle', authenticateToken, async (req, res) => {
  const { enabled } = req.body;
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    const updateData = {
      emergency_tapout_enabled: enabled,
    };

    // If enabling for the first time, set last reset to now
    if (enabled) {
      const { data } = await supabase
        .from('user_cards')
        .select('emergency_tapout_last_reset')
        .eq('email', normalizedEmail)
        .single();

      if (!data?.emergency_tapout_last_reset) {
        updateData.emergency_tapout_last_reset = new Date().toISOString();
        updateData.emergency_tapout_remaining = 3;
      }
    }

    const { error } = await supabase
      .from('user_cards')
      .update(updateData)
      .eq('email', normalizedEmail);

    if (error) {
      console.error('Error toggling emergency tapout:', error);
      return res.status(500).json({ error: 'Failed to toggle emergency tapout' });
    }

    console.log(`Emergency tapout ${enabled ? 'enabled' : 'disabled'} for ${normalizedEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Toggle emergency tapout error:', error);
    res.status(500).json({ error: 'Failed to toggle emergency tapout' });
  }
});

// POST /api/emergency-tapout/use - Use one emergency tapout (PROTECTED)
// Note: Emergency tapout is now enabled per-preset via allowEmergencyTapout field.
// The frontend checks preset.allowEmergencyTapout before calling this endpoint.
// This endpoint validates remaining tapouts count and deactivates the preset.
app.post('/api/emergency-tapout/use', authenticateToken, async (req, res) => {
  const { presetId, skipTapoutDecrement } = req.body;
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    // Get current status
    const { data, error: fetchError } = await supabase
      .from('user_cards')
      .select('emergency_tapout_remaining, emergency_tapout_next_refill')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !data) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only check tapout count if not skipping decrement (slide-to-unlock case)
    if (!skipTapoutDecrement) {
      if ((data.emergency_tapout_remaining ?? 0) <= 0) {
        return res.status(400).json({ error: 'No emergency tapouts remaining' });
      }
    }

    // Calculate new remaining count and refill date (only if not skipping)
    let newRemaining = data.emergency_tapout_remaining ?? 3;
    let nextRefillDate = data.emergency_tapout_next_refill;

    if (!skipTapoutDecrement) {
      newRemaining = newRemaining - 1;
      // Calculate next refill date
      // If going from 3 to 2, start the 2-week countdown
      // If already below 3, keep the existing countdown (don't reset it)
      if (data.emergency_tapout_remaining === 3) {
        // First tapout used, start the refill countdown
        nextRefillDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 2 weeks from now
      }
      // If already had a refill date scheduled, keep it
    }

    // Build update object - always unlock
    const updateObj = {
      is_locked: false,
      lock_started_at: null,
      lock_ends_at: null,
      settings: null, // Clear active settings
    };

    // Only update tapout count if not skipping
    if (!skipTapoutDecrement) {
      updateObj.emergency_tapout_remaining = newRemaining;
      updateObj.emergency_tapout_next_refill = nextRefillDate;
    }

    // Also unlock the user when using emergency tapout
    const { error: updateError } = await supabase
      .from('user_cards')
      .update(updateObj)
      .eq('email', normalizedEmail);

    if (updateError) {
      console.error('Error using emergency tapout:', updateError);
      return res.status(500).json({ error: 'Failed to use emergency tapout' });
    }

    // Deactivate the preset that was using emergency tapout
    // This prevents scheduled/timed presets from immediately re-activating
    if (presetId) {
      const { error: presetError } = await supabase
        .from('user_presets')
        .update({ is_active: false })
        .eq('email', normalizedEmail)
        .eq('preset_id', presetId);

      if (presetError) {
        console.error('Error deactivating preset after emergency tapout:', presetError);
        // Don't fail the request, the main operation succeeded
      } else {
        console.log(`Preset ${presetId} deactivated after emergency tapout`);
      }
    } else {
      // If no specific preset ID provided, deactivate all active presets for this user
      const { error: presetError } = await supabase
        .from('user_presets')
        .update({ is_active: false })
        .eq('email', normalizedEmail)
        .eq('is_active', true);

      if (presetError) {
        console.error('Error deactivating presets after emergency tapout:', presetError);
      } else {
        console.log(`All active presets deactivated for ${normalizedEmail} after emergency tapout`);
      }
    }

    if (skipTapoutDecrement) {
      console.log(`Slide unlock (no tapout decrement) for ${normalizedEmail}`);
    } else {
      console.log(`Emergency tapout used for ${normalizedEmail}, ${newRemaining} remaining, next refill: ${nextRefillDate}`);
    }
    res.json({ success: true, remaining: newRemaining, nextRefillDate });
  } catch (error) {
    console.error('Use emergency tapout error:', error);
    res.status(500).json({ error: 'Failed to use emergency tapout' });
  }
});

// ============ THEME ENDPOINTS ============

// GET /api/user-theme - Get user's theme preference (PROTECTED)
app.get('/api/user-theme', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail; // Get email from verified token

  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select('theme')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      return res.json({ theme: 'dark' }); // Default to dark
    }

    res.json({ theme: data.theme || 'dark' });
  } catch (error) {
    console.error('Get user theme error:', error);
    res.status(500).json({ error: 'Failed to get theme' });
  }
});

// POST /api/user-theme - Save user's theme preference (PROTECTED)
app.post('/api/user-theme', authenticateToken, async (req, res) => {
  const { theme } = req.body;
  const normalizedEmail = req.userEmail; // Get email from verified token
  console.log('[user-theme] Request received for user:', normalizedEmail, 'theme:', theme);

  if (!theme) {
    console.log('[user-theme] Validation failed: No theme provided');
    return res.status(400).json({ error: 'Theme required' });
  }

  if (theme !== 'dark' && theme !== 'light') {
    console.log('[user-theme] Validation failed: Invalid theme value:', theme);
    return res.status(400).json({ error: 'Theme must be "dark" or "light"' });
  }

  try {
    const { error } = await supabase
      .from('user_cards')
      .update({ theme })
      .eq('email', normalizedEmail);

    if (error) {
      console.error('Error saving theme:', error);
      return res.status(500).json({ error: 'Failed to save theme' });
    }

    console.log(`Theme saved for ${normalizedEmail}: ${theme}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Save theme error:', error);
    res.status(500).json({ error: 'Failed to save theme' });
  }
});

// ============ DEFAULT PRESETS HELPER ============

// Create default presets for new users
async function createDefaultPresetsForUser(email) {
  const normalizedEmail = email.toLowerCase();

  try {
    // Check if user already has presets (safety check)
    const { data: existing } = await supabase
      .from('user_presets')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`User ${normalizedEmail} already has presets, skipping default creation`);
      return;
    }

    // Default preset 1: XXX Sites
    const xxxSitesPreset = {
      email: normalizedEmail,
      preset_id: `xxx-sites-${Date.now()}`,
      name: 'XXX Sites',
      mode: 'specific',
      selected_apps: [],
      blocked_websites: [
        'pornhub.com',
        'xvideos.com',
        'xnxx.com',
        'xhamster.com',
        'redtube.com',
        'youporn.com',
        'tube8.com',
        'spankbang.com',
        'beeg.com',
        'porn.com',
        'brazzers.com',
        'bangbros.com',
        'realitykings.com',
        'naughtyamerica.com',
        'mofos.com',
        'digitalplayground.com',
        'fakehub.com',
        'teamskeet.com',
        'vixen.com',
        'tushy.com',
        'blacked.com',
        'eporner.com',
        'pornone.com',
        'hqporner.com',
        'daftsex.com',
        'onlyfans.com',
        'fansly.com',
        'chaturbate.com',
        'stripchat.com',
        'livejasmin.com',
        'bongacams.com',
        'myfreecams.com',
        'cam4.com',
        'camsoda.com',
        'streamate.com',
      ],
      timer_days: 0,
      timer_hours: 0,
      timer_minutes: 0,
      timer_seconds: 0,
      no_time_limit: true,
      block_settings: false,
      is_active: false,
      is_default: false,
      target_date: null,
      allow_emergency_tapout: true,
      is_scheduled: false,
      schedule_start_date: null,
      schedule_end_date: null,
      repeat_enabled: false,
      repeat_unit: null,
      repeat_interval: null,
      strict_mode: false,
    };

    // Default preset 2: Social Media Apps & Sites
    const socialMediaPreset = {
      email: normalizedEmail,
      preset_id: `social-media-${Date.now() + 1}`,
      name: 'Social Media Apps & Sites',
      mode: 'specific',
      selected_apps: [
        'com.instagram.android',
        'com.zhiliaoapp.musically', // TikTok
        'com.google.android.youtube',
        'com.twitter.android',
        'com.facebook.katana',
        'com.snapchat.android',
        'com.whatsapp',
        'com.facebook.orca', // Messenger
        'com.reddit.frontpage',
        'com.discord',
        'com.pinterest',
        'com.linkedin.android',
        'tv.twitch.android.app',
        'com.tumblr',
        'org.telegram.messenger',
        'com.bereal.ft',
        'com.lemon8.android',
      ],
      blocked_websites: [
        'instagram.com',
        'tiktok.com',
        'youtube.com',
        'twitter.com',
        'x.com',
        'facebook.com',
        'snapchat.com',
        'whatsapp.com',
        'reddit.com',
        'discord.com',
        'pinterest.com',
        'linkedin.com',
        'twitch.tv',
        'tumblr.com',
        'telegram.org',
        'bereal.com',
        'lemon8-app.com',
        'threads.net',
      ],
      timer_days: 0,
      timer_hours: 0,
      timer_minutes: 0,
      timer_seconds: 0,
      no_time_limit: true,
      block_settings: false,
      is_active: false,
      is_default: false,
      target_date: null,
      allow_emergency_tapout: true,
      is_scheduled: false,
      schedule_start_date: null,
      schedule_end_date: null,
      repeat_enabled: false,
      repeat_unit: null,
      repeat_interval: null,
      strict_mode: false,
    };

    // Insert both presets
    const { error: insertError } = await supabase
      .from('user_presets')
      .insert([xxxSitesPreset, socialMediaPreset]);

    if (insertError) {
      console.error('Error creating default presets:', insertError);
    } else {
      console.log(`Default presets created for ${normalizedEmail}`);
    }
  } catch (error) {
    console.error('Error in createDefaultPresetsForUser:', error);
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Scute API is running', database: supabaseUrl ? 'Supabase connected' : 'No database' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (supabaseUrl) {
    console.log('Connected to Supabase');
  } else {
    console.log('WARNING: Supabase not configured');
  }
});
