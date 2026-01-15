require('dotenv').config();
const express = require('express');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
const bcrypt = require('bcrypt');
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

app.use(cors());
app.use(express.json());

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/send-code - Send verification code (signup only)
app.post('/api/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
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

  if (!email || !code || !password) {
    return res.status(400).json({ error: 'Email, code, and password required' });
  }

  if (password.length < 6) {
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

    // Create user_cards entry for this user
    const { error: cardError } = await supabase
      .from('user_cards')
      .insert({
        email: normalizedEmail,
        uid: null,
        settings: null,
        registered_at: null,
      });

    if (cardError && !cardError.message.includes('duplicate')) {
      console.error('Error creating user_cards entry:', cardError);
    }

    // Delete verification code
    await supabase.from('verification_codes').delete().eq('email', normalizedEmail);

    console.log(`User registered: ${email}`);
    res.json({ success: true, message: 'Account created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/signin - Sign in with email and password
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
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

  if (!email || !code) {
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

    // Delete verification code
    await supabase.from('verification_codes').delete().eq('email', normalizedEmail);

    console.log(`User signed in: ${email}`);
    res.json({ success: true, message: 'Sign in successful' });
  } catch (error) {
    console.error('Verify sign-in error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/add-card-to-whitelist - Add a valid UID to the whitelist (admin only)
app.post('/api/add-card-to-whitelist', async (req, res) => {
  const { uid, adminEmail } = req.body;

  // Admin email check
  const ADMIN_EMAIL = 'longpatrick3317@gmail.com';
  if (!adminEmail || adminEmail.toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Unauthorized - admin only' });
  }

  if (!uid) {
    return res.status(400).json({ error: 'UID required' });
  }

  // Normalize UID (remove colons, uppercase)
  const normalizedUid = uid.replace(/:/g, '').toUpperCase();

  try {
    // Check if UID already exists
    const { data: existing } = await supabase
      .from('valid_scute_uids')
      .select('uid')
      .eq('uid', normalizedUid)
      .single();

    if (existing) {
      return res.json({ success: true, alreadyExists: true, message: 'UID already in whitelist' });
    }

    // Insert new UID
    const { error } = await supabase
      .from('valid_scute_uids')
      .insert({
        uid: normalizedUid,
        added_by: adminEmail,
      });

    if (error) {
      console.error('Error adding UID to whitelist:', error);
      return res.status(500).json({ error: 'Failed to add UID to whitelist' });
    }

    console.log(`UID added to whitelist: ${normalizedUid} by ${adminEmail}`);
    res.json({ success: true, message: 'UID added to whitelist' });
  } catch (error) {
    console.error('Add to whitelist error:', error);
    res.status(500).json({ error: 'Failed to add UID' });
  }
});

// POST /api/register-card - Register a card UID to a user's email
app.post('/api/register-card', async (req, res) => {
  const { uid, email } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: 'UID and email required' });
  }

  const normalizedUid = uid.replace(/:/g, '').toUpperCase();
  const normalizedEmail = email.toLowerCase();

  try {
    // Check if UID is in valid UIDs list
    const { data: validUid, error: validError } = await supabase
      .from('valid_scute_uids')
      .select('uid')
      .eq('uid', normalizedUid)
      .single();

    if (validError || !validUid) {
      return res.status(404).json({ error: 'Not a valid Scute card', errorCode: 'NOT_FOUND' });
    }

    // Check if UID is already registered to another user
    const { data: existingCard } = await supabase
      .from('user_cards')
      .select('email')
      .eq('uid', normalizedUid)
      .single();

    if (existingCard && existingCard.email !== normalizedEmail) {
      return res.status(409).json({ error: 'Card already registered to another account', errorCode: 'ALREADY_REGISTERED' });
    }

    // Check if user_cards row exists for this email
    const { data: existingUserCard } = await supabase
      .from('user_cards')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    let updateError;
    if (existingUserCard) {
      // Update existing row
      const result = await supabase
        .from('user_cards')
        .update({
          uid: normalizedUid,
          registered_at: new Date().toISOString(),
        })
        .eq('email', normalizedEmail);
      updateError = result.error;
    } else {
      // Insert new row (user_cards entry was never created)
      const result = await supabase
        .from('user_cards')
        .insert({
          email: normalizedEmail,
          uid: normalizedUid,
          settings: null,
          registered_at: new Date().toISOString(),
        });
      updateError = result.error;
    }

    if (updateError) {
      console.error('Error registering card:', updateError);
      return res.status(500).json({ error: 'Failed to register card', errorCode: 'SERVER_ERROR' });
    }

    console.log(`Card registered: ${normalizedUid} to ${normalizedEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Register card error:', error);
    res.status(500).json({ error: 'Failed to register card', errorCode: 'SERVER_ERROR' });
  }
});

// POST /api/save-settings - Save user tap settings
app.post('/api/save-settings', async (req, res) => {
  const { email, settings } = req.body;

  if (!email || !settings) {
    return res.status(400).json({ error: 'Email and settings required' });
  }

  const normalizedEmail = email.toLowerCase();

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
          uid: null,
          settings: settings,
          registered_at: null,
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

// POST /api/unregister-card - Unregister a card from a user
app.post('/api/unregister-card', async (req, res) => {
  const { uid, email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    const { error } = await supabase
      .from('user_cards')
      .update({
        uid: null,
        settings: null,
        registered_at: null,
      })
      .eq('email', normalizedEmail);

    if (error) {
      console.error('Error unregistering card:', error);
      return res.status(500).json({ error: 'Failed to unregister card' });
    }

    console.log(`Card unregistered for: ${normalizedEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Unregister card error:', error);
    res.status(500).json({ error: 'Failed to unregister card' });
  }
});

// GET /api/user-card-data - Get user's card data and settings
app.get('/api/user-card-data', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toString().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select('uid, settings, registered_at')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      return res.json({ uid: null, settings: null, registered_at: null });
    }

    res.json(data);
  } catch (error) {
    console.error('Get user card data error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// POST /api/reset-password-request - Request password reset code
app.post('/api/reset-password-request', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
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

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password required' });
  }

  if (newPassword.length < 6) {
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

// POST /api/delete-account - Delete user account completely
// Deletes all user data: presets, user_cards, users table entries
// Does NOT delete from valid_scute_uids (whitelist) - the Scute card remains valid for future registration
app.post('/api/delete-account', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase();

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

// GET /api/presets - Get all presets for a user
app.get('/api/presets', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toString().toLowerCase();

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
    }));

    res.json({ presets });
  } catch (error) {
    console.error('Get presets error:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// POST /api/presets - Create or update a preset
app.post('/api/presets', async (req, res) => {
  const { email, preset } = req.body;

  if (!email || !preset) {
    return res.status(400).json({ error: 'Email and preset required' });
  }

  const normalizedEmail = email.toLowerCase();

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
    };

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

// DELETE /api/presets - Delete a preset
app.delete('/api/presets', async (req, res) => {
  const { email, presetId } = req.body;

  if (!email || !presetId) {
    return res.status(400).json({ error: 'Email and presetId required' });
  }

  const normalizedEmail = email.toLowerCase();

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

// POST /api/presets/activate - Activate a non-scheduled preset (deactivates other non-scheduled presets only)
app.post('/api/presets/activate', async (req, res) => {
  const { email, presetId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase();

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

// POST /api/presets/init-defaults - Initialize default presets for a user
app.post('/api/presets/init-defaults', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase();

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

// POST /api/presets/reset - Delete all presets and recreate defaults
app.post('/api/presets/reset', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase();

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

// POST /api/lock-status - Update user's lock status
app.post('/api/lock-status', async (req, res) => {
  const { email, isLocked, lockEndsAt } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase();

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

// GET /api/lock-status - Get user's lock status
app.get('/api/lock-status', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toString().toLowerCase();

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

// GET /api/emergency-tapout - Get user's emergency tapout status
// Gradual refill system: +1 tapout every 2 weeks until back to 3
app.get('/api/emergency-tapout', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toString().toLowerCase();

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

// POST /api/emergency-tapout/toggle - Enable/disable emergency tapout
app.post('/api/emergency-tapout/toggle', async (req, res) => {
  const { email, enabled } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase();

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

// POST /api/emergency-tapout/use - Use one emergency tapout
// Note: Emergency tapout is now enabled per-preset via allowEmergencyTapout field.
// The frontend checks preset.allowEmergencyTapout before calling this endpoint.
// This endpoint validates remaining tapouts count and deactivates the preset.
app.post('/api/emergency-tapout/use', async (req, res) => {
  const { email, presetId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase();

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

    if ((data.emergency_tapout_remaining ?? 0) <= 0) {
      return res.status(400).json({ error: 'No emergency tapouts remaining' });
    }

    const newRemaining = (data.emergency_tapout_remaining ?? 3) - 1;

    // Calculate next refill date
    // If going from 3 to 2, start the 2-week countdown
    // If already below 3, keep the existing countdown (don't reset it)
    let nextRefillDate = data.emergency_tapout_next_refill;
    if (data.emergency_tapout_remaining === 3) {
      // First tapout used, start the refill countdown
      nextRefillDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 2 weeks from now
    }
    // If already had a refill date scheduled, keep it

    // Also unlock the user when using emergency tapout
    const { error: updateError } = await supabase
      .from('user_cards')
      .update({
        emergency_tapout_remaining: newRemaining,
        emergency_tapout_next_refill: nextRefillDate,
        is_locked: false,
        lock_started_at: null,
        lock_ends_at: null,
        settings: null, // Clear active settings
      })
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

    console.log(`Emergency tapout used for ${normalizedEmail}, ${newRemaining} remaining, next refill: ${nextRefillDate}`);
    res.json({ success: true, remaining: newRemaining, nextRefillDate });
  } catch (error) {
    console.error('Use emergency tapout error:', error);
    res.status(500).json({ error: 'Failed to use emergency tapout' });
  }
});

// ============ THEME ENDPOINTS ============

// GET /api/user-theme - Get user's theme preference
app.get('/api/user-theme', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toString().toLowerCase();

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

// POST /api/user-theme - Save user's theme preference
app.post('/api/user-theme', async (req, res) => {
  const { email, theme } = req.body;

  if (!email || !theme) {
    return res.status(400).json({ error: 'Email and theme required' });
  }

  if (theme !== 'dark' && theme !== 'light') {
    return res.status(400).json({ error: 'Theme must be "dark" or "light"' });
  }

  const normalizedEmail = email.toLowerCase();

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
