require('dotenv').config();
const express = require('express');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const path = require('path');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (for logo in emails)
app.use(express.static(path.join(__dirname, '.')));

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
        .footer { color: #aaa; font-size: 0.85em; text-align: center; margin-top: 40px; }
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
          <li><strong>Email Address:</strong> Collected during account registration or Google Sign-In to identify your account.</li>
          <li><strong>Preset Configurations:</strong> Your blocking presets, including selected apps, blocked websites, timer settings, overlay customization, and schedule data are stored on our servers to sync across sessions. This data is not tampered with and is stored solely to provide and maintain your user experience.</li>
          <li><strong>Custom Overlay Images:</strong> If you upload a custom image for your blocking overlay, the image is stored on our servers.</li>
          <li><strong>App Usage Data:</strong> We access app usage statistics on your device to track screen time and enforce app-blocking features. This data is processed locally on your device and is not transmitted to our servers.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information for the following purposes:</p>
        <ul>
          <li>To create and manage your account.</li>
          <li>To enable core app functionality, such as app blocking and screen time tracking.</li>
          <li>To store and sync your preset configurations and overlay customizations across sessions.</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <ul>
          <li>Your email address and preset configurations are stored securely in our cloud database.</li>
          <li>App usage data is stored locally on your device and is not uploaded to our servers.</li>
          <li>Custom overlay images are stored on our servers and associated with your account.</li>
          <li>We use industry-standard encryption to protect data in transit and at rest.</li>
        </ul>

        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Google Sign-In:</strong> For optional account authentication using your Google account. We receive your email address and display name from Google.</li>
          <li><strong>Google Play:</strong> For processing subscription and one-time payments. We do not store your payment information (credit card details, billing address, etc.). All payment processing is handled securely by Google Play. We only receive confirmation of your subscription status.</li>
          <li><strong>SendGrid:</strong> For sending transactional emails, including account verification, sign-in codes, and Alert Notification emails when the feature is enabled.</li>
          <li><strong>Twilio:</strong> For sending SMS text messages when the Alert Notifications feature is enabled and a phone number is provided. Standard message and data rates may apply.</li>
        </ul>
        <p>These services have their own privacy policies, and we encourage you to review them.</p>

        <h2>5. Permissions</h2>
        <p>To provide our services, the app requires the following permissions:</p>
        <ul>
          <li><strong>Usage Access:</strong> To monitor and block apps on your device.</li>
          <li><strong>Display Over Other Apps:</strong> To show blocking overlays.</li>
          <li><strong>Accessibility Services:</strong> To enforce app-blocking functionality.</li>
          <li><strong>Notification Access:</strong> To block notifications from restricted apps.</li>
          <li><strong>VPN Service:</strong> To block restricted websites. This VPN operates locally on your device and does not route your internet traffic through external servers.</li>
          <li><strong>Device Administrator:</strong> To prevent unauthorized uninstallation of the app during active blocking sessions.</li>
          <li><strong>Exact Alarms:</strong> To schedule blocking sessions at precise times.</li>
          <li><strong>Boot Receiver:</strong> To restore active sessions after device restarts.</li>
          <li><strong>Foreground Service:</strong> To maintain blocking functionality while the app runs in the background.</li>
        </ul>
        <p>These permissions are used solely for the app's intended functionality.</p>

        <h2>6. Data Sharing</h2>
        <p>We do not sell, rent, or share your personal information with third parties, except:</p>
        <ul>
          <li>When required by law.</li>
          <li>To protect the rights, safety, or property of Scute or its users.</li>
        </ul>

        <h2>7. Communications</h2>
        <p>By providing your email address and creating an account, you consent to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Please note that even if you opt out of marketing emails, we may still send you transactional or account-related communications (such as account verification, security alerts, and service updates).</p>
        <p><strong>Alert Notifications:</strong> If you enable the Alert Notifications feature on a preset and provide an email address or phone number, you expressly consent to receive automated alert emails and/or SMS text messages sent to those addresses each time a blocked app or website is opened during that preset. You may withdraw consent at any time by disabling the Alert Notifications toggle in your preset settings. Message and data rates may apply for SMS alerts. We do not share your alert email or phone number with any third party except SendGrid (email delivery) and Twilio (SMS delivery) solely for the purpose of sending these alerts.</p>

        <h2>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access, update, or delete your account information.</li>
          <li>Revoke app permissions at any time through your device settings.</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:info@scuteapp.com">info@scuteapp.com</a>.</p>

        <h2>9. Children's Privacy</h2>
        <p>Scute is not intended for children under the age of 13. We do not knowingly collect personal information from children.</p>

        <h2>10. Data Retention</h2>
        <p>We retain your email address for as long as your account is active. App usage data is stored locally on your device and is deleted when you uninstall the App. Upon account deletion, all associated data is permanently removed from our servers.</p>

        <h2>11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Any changes will be posted in the app, and the "Effective Date" will be updated accordingly.</p>

        <h2>12. Contact Us</h2>
        <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
        <p>Email: <a href="mailto:info@scuteapp.com">info@scuteapp.com</a></p>

        <p class="footer">&copy; 2026 Scute LLC</p>
      </div>
    </body>
    </html>
  `);
});

// GET /terms-of-service - Public terms of service page
app.get('/terms-of-service', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Terms of Service - Scute</title>
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
        .footer { color: #aaa; font-size: 0.85em; text-align: center; margin-top: 40px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Terms of Service</h1>
        <p class="effective-date">Effective Date: January 6, 2026</p>

        <p>Welcome to Scute. By downloading, installing, or using the Scute mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Scute, you confirm that you are at least 13 years of age and have the legal capacity to enter into these Terms. If you are using the App on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.</p>

        <h2>2. Description of Service</h2>
        <p>Scute is a digital wellness application designed to help users manage screen time by blocking access to selected applications, websites, and the Settings app on their device. The App uses accessibility services, usage access permissions, and notification access to enforce blocking functionality, including blocking notifications from restricted apps.</p>
        <p>Website blocking is achieved through a local VPN service that operates entirely on your device. No internet traffic is routed through external servers.</p>
        <p>The App supports scheduled sessions that can activate automatically at preset times without requiring user interaction at the time of activation. Blocking sessions persist across device restarts — if your device reboots during an active session, blocking will automatically resume when the device starts up.</p>
        <p>The App may use Device Administrator privileges to prevent its own uninstallation during active blocking sessions, ensuring the integrity of the blocking functionality.</p>

        <h2>3. User Responsibilities</h2>
        <p>You are solely responsible for:</p>
        <ul>
          <li>Configuring the App according to your preferences and needs.</li>
          <li>Understanding that enabling blocking features will restrict access to selected apps and device settings.</li>
          <li>Ensuring you have alternative means to access essential functions (such as emergency calls) during blocking sessions.</li>
          <li>Any consequences resulting from your use of the App's blocking features.</li>
        </ul>

        <h2>4. Assumption of Risk</h2>
        <p>You acknowledge and agree that:</p>
        <ul>
          <li>The App is designed to intentionally restrict access to your device's applications and settings.</li>
          <li>Blocking sessions cannot be easily bypassed once activated, which is a core feature of the App.</li>
          <li>Enabling Strict Mode will prevent you from ending a blocking session unless you use the Emergency Tapout feature.</li>
          <li>The App may prevent its own uninstallation during active blocking sessions using Device Administrator privileges.</li>
          <li>You use the App at your own risk and discretion.</li>
          <li>You are responsible for ensuring blocking sessions do not interfere with essential device functions you may need.</li>
        </ul>

        <h2>5. Disclaimer of Warranties</h2>
        <p>THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.</p>

        <h2>6. Limitation of Liability</h2>
        <p>If you experience any issues such as prolonged blocking due to bugs, unexpected behavior, or accidental activation, please contact our support team at <a href="mailto:support@scuteapp.com">support@scuteapp.com</a> for assistance. We are committed to helping resolve any problems you may encounter.</p>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SCUTE AND ITS DEVELOPERS, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:</p>
        <ul>
          <li>Temporary inability to access blocked applications during a blocking session.</li>
          <li>Missed notifications, messages, or communications during blocking sessions.</li>
          <li>Any inconvenience or frustration caused by blocking features working as intended.</li>
          <li>Any other damages arising from your use of the App.</li>
        </ul>

        <h2>7. Indemnification</h2>
        <p>You agree to indemnify, defend, and hold harmless Scute and its developers, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorney's fees) arising out of or in any way connected with your use of the App or violation of these Terms.</p>

        <h2>8. Emergency Tapout Feature</h2>
        <p>The App provides an optional "Emergency Tapout" feature that allows users to end blocking sessions early. This feature is limited and subject to usage restrictions. We do not guarantee that the Emergency Tapout feature will always be available or functional. Users who disable this feature accept full responsibility for completing their blocking sessions.</p>

        <h2>9. Account Termination</h2>
        <p>We reserve the right to suspend or terminate your account at any time for any reason, including but not limited to violation of these Terms. You may delete your account at any time through the App's settings if unblocked. Upon account deletion, your email address and all associated account data will be permanently removed from our servers.</p>

        <h2>10. Subscriptions and Payments</h2>
        <p>Scute offers subscription plans and a lifetime purchase option:</p>
        <ul>
          <li><strong>Free Trial:</strong> New users receive a 7-day free trial with full access to all features.</li>
          <li><strong>Monthly Subscription:</strong> $6.95/month, billed monthly.</li>
          <li><strong>Yearly Subscription:</strong> $4.95/month ($59.40/year), billed annually.</li>
          <li><strong>Lifetime Purchase:</strong> $49.95 one-time payment for permanent access.</li>
        </ul>
        <p>Subscriptions are processed through Google Play. By subscribing, you agree to Google Play's terms of service. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period. You can manage or cancel your subscription through Google Play Store settings. Refunds are handled according to Google Play's refund policy.</p>

        <h2>11. Communications &amp; Alert Notifications</h2>
        <p>By creating an account and providing your email address, you agree to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Opting out of marketing emails will not affect transactional or account-related communications (such as account verification, security alerts, and service updates).</p>
        <p><strong>Alert Notifications:</strong> By enabling the Alert Notifications feature on a preset and providing an email address and/or phone number, you expressly consent to receive automated alert messages each time a blocked app or website is opened during that preset. You may revoke this consent at any time by disabling the Alert Notifications toggle in your preset settings. Standard message and data rates may apply for SMS.</p>

        <h2>12. Modifications to Terms</h2>
        <p>We reserve the right to modify these Terms at any time. Changes will be effective upon posting within the App. Your continued use of the App after any modifications constitutes acceptance of the updated Terms.</p>

        <h2>13. Governing Law</h2>
        <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Scute operates, without regard to conflict of law principles.</p>

        <h2>14. Severability</h2>
        <p>If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.</p>

        <h2>15. Contact Us</h2>
        <p>If you have any questions about these Terms of Service, please contact us at:</p>
        <p>Email: <a href="mailto:info@scuteapp.com">info@scuteapp.com</a></p>

        <p class="footer">&copy; 2026 Scute LLC</p>
      </div>
    </body>
    </html>
  `);
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Detect if a string looks like a phone number rather than an email
function isPhone(str) {
  if (!str) return false;
  const digits = str.replace(/\D/g, '');
  return !str.includes('@') && digits.length >= 10 && digits.length <= 11;
}

// Normalize to a consistent identifier: E.164 for phone, lowercase for email
function normalizeIdentifier(str) {
  if (isPhone(str)) {
    const digits = str.replace(/\D/g, '');
    return digits.length === 11 ? `+${digits}` : `+1${digits}`;
  }
  return str.toLowerCase();
}

// Send a verification code via SMS (Twilio)
async function sendSmsCode(to, code) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_MESSAGING_SERVICE_SID) {
    throw new Error('Twilio credentials not configured');
  }
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await twilio.messages.create({
    body: `Your Scute verification code is: ${code}. This code expires in 10 minutes.`,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    to,
  });
}

// POST /api/send-code - Send verification code (signup only)
app.post('/api/send-code', async (req, res) => {
  const { email } = req.body;
  console.log('[send-code] Request received');

  const phoneInput = isPhone(email);
  if (!email || (!email.includes('@') && !phoneInput)) {
    console.log('[send-code] Validation failed: Invalid email or phone format');
    return res.status(400).json({ error: 'Invalid email or phone number' });
  }

  const normalizedIdentifier = normalizeIdentifier(email);

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', normalizedIdentifier)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: phoneInput ? 'Phone number already registered' : 'Email already registered' });
    }

    // Generate verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing codes for this identifier
    await supabase.from('verification_codes').delete().eq('email', normalizedIdentifier);

    // Store new code
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({ email: normalizedIdentifier, code, expires_at: expiresAt.toISOString() });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
      return res.status(500).json({ error: 'Failed to generate verification code' });
    }

    if (phoneInput) {
      // Send SMS via Twilio
      await sendSmsCode(normalizedIdentifier, code);
      console.log(`SMS code sent to ${normalizedIdentifier}: ${code}`);
    } else {
      // Send email via SendGrid
      const msg = {
        to: email,
        from: { email: process.env.FROM_EMAIL, name: 'Scute' },
        subject: 'Your Scute Verification Code',
        text: `Your verification code is: ${code}. This code expires in 10 minutes.`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Verdana, Geneva, sans-serif; background-color: #28282B; border-radius: 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 400px; margin: 0 auto;">
              <tr>
                <td align="center" style="padding: 30px 20px 20px 20px;">
                  <p style="margin: 0 0 10px 0; font-size: 8px; color: #cccccc;">
                    Enter this code to verify your email:
                  </p>
                  <div style="font-size: 26px; font-weight: 700; letter-spacing: 8px; color: #ffffff; margin-bottom: 10px;">
                    ${code}
                  </div>
                  <p style="margin: 0 0 14px 0; font-size: 8px; color: #888888;">
                    This code expires in 10 minutes.
                  </p>
                  <p style="margin: 0 0 14px 0; font-size: 7px; color: #666666;">
                    If you didn't request this code, you can safely ignore this email.
                  </p>
                  <p style="margin: 0; font-size: 7px; color: #555555;">
                    © 2026 Scute LLC
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };
      await sgMail.send(msg);
      console.log(`Code sent to ${email}: ${code}`);
    }

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('[send-code] Error:', error);
    if (error.response) console.error('Error body:', error.response.body);
    res.status(500).json({ error: phoneInput ? 'Failed to send SMS' : 'Failed to send email' });
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

  const normalizedEmail = normalizeIdentifier(email);

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

// POST /api/signin - Sign in with email/phone and password
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;
  console.log('[signin] Request received');

  if (!email || !password) {
    console.log('[signin] Validation failed: Missing email or password');
    return res.status(400).json({ error: 'Email/phone and password required' });
  }

  const phoneInput = isPhone(email);
  const normalizedEmail = normalizeIdentifier(email);

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

    await supabase.from('verification_codes').delete().eq('email', normalizedEmail);
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({ email: normalizedEmail, code, expires_at: expiresAt.toISOString() });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
      return res.status(500).json({ error: 'Failed to generate verification code' });
    }

    if (phoneInput) {
      await sendSmsCode(normalizedEmail, code);
      console.log(`Sign-in SMS sent to ${normalizedEmail}: ${code}`);
    } else {
      const msg = {
        to: email,
        from: { email: process.env.FROM_EMAIL, name: 'Scute' },
        subject: 'Your Scute Sign In Code',
        text: `Your sign in code is: ${code}. This code expires in 10 minutes.`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Verdana, Geneva, sans-serif; background-color: #28282B; border-radius: 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 400px; margin: 0 auto;">
              <tr>
                <td align="center" style="padding: 30px 20px 20px 20px;">
                  <p style="margin: 0 0 10px 0; font-size: 8px; color: #cccccc;">
                    Enter this code to sign in:
                  </p>
                  <div style="font-size: 26px; font-weight: 700; letter-spacing: 8px; color: #ffffff; margin-bottom: 10px;">
                    ${code}
                  </div>
                  <p style="margin: 0 0 14px 0; font-size: 8px; color: #888888;">
                    This code expires in 10 minutes.
                  </p>
                  <p style="margin: 0 0 14px 0; font-size: 7px; color: #666666;">
                    If you didn't request this code, you can safely ignore this email.
                  </p>
                  <p style="margin: 0; font-size: 7px; color: #555555;">
                    © 2026 Scute LLC
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };
      await sgMail.send(msg);
      console.log(`Sign-in code sent to ${email}: ${code}`);
    }

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ error: phoneInput ? 'Failed to send SMS' : 'Failed to send email' });
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

  const normalizedEmail = normalizeIdentifier(email);

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

// GET /api/user-flags - Get per-user flags (tos_accepted, onboarding_complete)
app.get('/api/user-flags', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail;
  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select('tos_accepted, onboarding_complete')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      // Row might not exist yet — return defaults
      return res.json({ tosAccepted: false, onboardingComplete: false });
    }

    res.json({
      tosAccepted: data.tos_accepted ?? false,
      onboardingComplete: data.onboarding_complete ?? false,
    });
  } catch (error) {
    console.error('[user-flags] GET error:', error);
    res.status(500).json({ error: 'Failed to get user flags' });
  }
});

// POST /api/user-flags - Set a per-user flag (tos_accepted, onboarding_complete)
app.post('/api/user-flags', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail;
  const { flag, value } = req.body;

  const allowedFlags = ['tos_accepted', 'onboarding_complete'];
  if (!allowedFlags.includes(flag)) {
    return res.status(400).json({ error: `Invalid flag: ${flag}` });
  }

  try {
    const { error } = await supabase
      .from('user_cards')
      .update({ [flag]: value === true })
      .eq('email', normalizedEmail);

    if (error) {
      console.error('[user-flags] POST error:', error);
      return res.status(500).json({ error: 'Failed to update flag' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[user-flags] POST error:', error);
    res.status(500).json({ error: 'Failed to update flag' });
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
      from: {
        email: process.env.FROM_EMAIL,
        name: 'Scute'
      },
      subject: 'Reset Your Scute Password',
      text: `Your password reset code is: ${code}. This code expires in 10 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Verdana, Geneva, sans-serif; background-color: #28282B; border-radius: 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 400px; margin: 0 auto;">
            <tr>
              <td align="center" style="padding: 30px 20px 20px 20px;">
                <p style="margin: 0 0 10px 0; font-size: 8px; color: #cccccc;">
                  Enter this code to reset your password:
                </p>
                <div style="font-size: 26px; font-weight: 700; letter-spacing: 8px; color: #ffffff; margin-bottom: 10px;">
                  ${code}
                </div>
                <p style="margin: 0 0 14px 0; font-size: 8px; color: #888888;">
                  This code expires in 10 minutes.
                </p>
                <p style="margin: 0 0 14px 0; font-size: 7px; color: #666666;">
                  If you didn't request this code, you can safely ignore this email.
                </p>
                <p style="margin: 0; font-size: 7px; color: #555555;">
                  © 2026 Scute LLC
                </p>
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
      isActive: false,
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
      // Custom overlay fields
      customBlockedText: p.custom_blocked_text || '',
      customOverlayImage: p.custom_overlay_image || '',
      // Custom redirect URL for blocked websites
      customRedirectUrl: p.custom_redirect_url || '',
      // Skip overlay
      skipOverlay: p.skip_overlay || false,
      // Alert notifications
      alertNotifyEnabled: p.alert_notify_enabled || false,
      alertEmail: p.alert_email || '',
      alertPhone: p.alert_phone || '',
    }));

    console.log('[presets:get] Returning', presets.length, 'presets for user:', normalizedEmail);
    presets.forEach(p => {
      console.log(`[presets:get]   - ${p.name}: strictMode=${p.strictMode}, allowEmergencyTapout=${p.allowEmergencyTapout}, noTimeLimit=${p.noTimeLimit}, customRedirectUrl='${p.customRedirectUrl}'`);
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
      // Custom overlay fields
      custom_blocked_text: preset.customBlockedText || '',
      custom_overlay_image: preset.customOverlayImage || '',
      // Custom redirect URL for blocked websites
      custom_redirect_url: preset.customRedirectUrl || '',
      // Skip overlay — just kick out without showing overlay
      skip_overlay: preset.skipOverlay || false,
      // Alert notifications
      alert_notify_enabled: preset.alertNotifyEnabled || false,
      alert_email: preset.alertEmail || '',
      alert_phone: preset.alertPhone || '',
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
      customRedirectUrl_from_request: preset.customRedirectUrl,
      custom_redirect_url_to_save: presetData.custom_redirect_url,
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

// NOTE: /api/presets/activate removed — isActive is now device-local via native SharedPreferences

// POST /api/presets/init-defaults - Initialize default presets for a user (PROTECTED)
app.post('/api/presets/init-defaults', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail; // Get email from verified token

  const { choice } = req.body;
  try {
    console.log(`[ONBOARDING] /api/presets/init-defaults called for ${normalizedEmail} — choice: ${choice}`);
    await createDefaultPresetsForUser(normalizedEmail, choice);
    console.log(`[ONBOARDING] /api/presets/init-defaults complete for ${normalizedEmail}`);
    res.json({ success: true, created: true });
  } catch (error) {
    console.error('Init defaults error:', error);
    res.status(500).json({ error: 'Failed to initialize presets' });
  }
});

// NOTE: /api/presets/deactivate-all removed — isActive is now device-local

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

// ============ OVERLAY IMAGE UPLOAD ============

// POST /api/overlay-image - Upload a custom overlay image to Supabase Storage (PROTECTED)
app.post('/api/overlay-image', authenticateToken, upload.single('image'), async (req, res) => {
  const normalizedEmail = req.userEmail;
  const presetId = req.body.presetId;

  console.log(`[overlay-image] POST received — email: ${normalizedEmail}, presetId: ${presetId}, hasFile: ${!!req.file}`);
  if (req.file) {
    console.log(`[overlay-image] File details — name: ${req.file.originalname}, type: ${req.file.mimetype}, size: ${req.file.size} bytes`);
  }

  if (!req.file) {
    console.error('[overlay-image] No image file in request');
    return res.status(400).json({ error: 'No image file provided' });
  }
  if (!presetId) {
    console.error('[overlay-image] No presetId in request');
    return res.status(400).json({ error: 'presetId is required' });
  }

  try {
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const filePath = `${normalizedEmail}/${presetId}.${ext}`;
    console.log(`[overlay-image] Uploading to Supabase Storage — path: ${filePath}, contentType: ${req.file.mimetype}, bufferSize: ${req.file.buffer.length}`);

    // Upload to Supabase Storage (upsert to overwrite existing)
    const { error: uploadError } = await supabase.storage
      .from('overlay-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('[overlay-image] Supabase upload error:', JSON.stringify(uploadError));
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('overlay-images')
      .getPublicUrl(filePath);

    console.log(`[overlay-image] Upload success — URL: ${urlData.publicUrl}`);
    res.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('[overlay-image] Exception:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// DELETE /api/overlay-image - Remove a custom overlay image (PROTECTED)
app.delete('/api/overlay-image', authenticateToken, async (req, res) => {
  const normalizedEmail = req.userEmail;
  const { presetId } = req.body;

  if (!presetId) {
    return res.status(400).json({ error: 'presetId is required' });
  }

  try {
    // List files in the user's preset folder to find the image
    const { data: files } = await supabase.storage
      .from('overlay-images')
      .list(normalizedEmail, { search: presetId });

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${normalizedEmail}/${f.name}`);
      await supabase.storage.from('overlay-images').remove(filePaths);
      console.log(`[overlay-image] Deleted for ${normalizedEmail}, preset ${presetId}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Overlay image delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ============ LOCK STATUS ENDPOINTS ============
// (overlay preset endpoints removed)

// ============ LOCK STATUS ENDPOINTS (REMOVED) ============
// Lock status is now fully device-local (native SharedPreferences).
// The /api/lock-status endpoints have been removed.

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

    // Safety net: if below max tapouts but no refill date, set one now
    if (remaining < 3 && !nextRefillDate) {
      console.log(`[TAPOUT SAFETY NET] Setting missing refill date for ${normalizedEmail} (remaining=${remaining}, db_remaining=${data.emergency_tapout_remaining})`);
      nextRefillDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks from now
      await supabase
        .from('user_cards')
        .update({ emergency_tapout_next_refill: nextRefillDate.toISOString() })
        .eq('email', normalizedEmail);
    }

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

    console.log(`[TAPOUT GET] ${normalizedEmail}: remaining=${remaining}, db_remaining=${data.emergency_tapout_remaining}, nextRefillDate=${nextRefillDate ? nextRefillDate.toISOString() : null}`);
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
      // Only start the 2-week refill countdown when going from 3 to 2 (first use).
      // If already below 3, keep the existing countdown — don't reset it.
      if ((data.emergency_tapout_remaining ?? 3) === 3) {
        nextRefillDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    // Build update object
    const updateObj = {
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

    // NOTE: is_active deactivation removed — isActive is now device-local
    console.log(`Emergency tapout processed for ${normalizedEmail} (preset: ${presetId || 'all'})`);

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
async function createDefaultPresetsForUser(email, choice = 'social_media') {
  const normalizedEmail = email.toLowerCase();

  try {
    // Check if user already has presets (safety check)
    const { data: existing } = await supabase
      .from('user_presets')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[ONBOARDING] ${normalizedEmail} already has presets — skipping default creation`);
      return;
    }

    console.log(`[ONBOARDING] creating 3 default presets for ${normalizedEmail}...`);
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
      name: 'Social Media',
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

    // Default preset 3: Social Media & XXX Sites (combined)
    const bothPreset = {
      email: normalizedEmail,
      preset_id: `both-${Date.now() + 2}`,
      name: 'Social Media & XXX Sites',
      mode: 'specific',
      selected_apps: [...socialMediaPreset.selected_apps],
      blocked_websites: [...socialMediaPreset.blocked_websites, ...xxxSitesPreset.blocked_websites],
      timer_days: 0,
      timer_hours: 0,
      timer_minutes: 0,
      timer_seconds: 0,
      no_time_limit: true,
      block_settings: false,
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

    // Only insert the preset matching the user's onboarding choice
    const presetMap = {
      social_media: socialMediaPreset,
      xxx: xxxSitesPreset,
      both: bothPreset,
    };
    const presetToInsert = presetMap[choice] ?? socialMediaPreset;

    console.log(`[ONBOARDING] creating preset "${presetToInsert.name}" for ${normalizedEmail} (choice: ${choice})`);
    const { error: insertError } = await supabase
      .from('user_presets')
      .insert([presetToInsert]);

    if (insertError) {
      console.error('[ONBOARDING] Error creating preset:', insertError);
    } else {
      console.log(`[ONBOARDING] preset "${presetToInsert.name}" created for ${normalizedEmail}`);
    }
  } catch (error) {
    console.error('Error in createDefaultPresetsForUser:', error);
  }
}

// POST /api/preset-alert — called by the Android service when a blocked app/site is opened
// Sends an email via SendGrid and/or an SMS via Twilio to the configured alert contacts
app.post('/api/preset-alert', authenticateToken, async (req, res) => {
  const { presetName, blockedApp, alertEmail, alertPhone } = req.body;

  if (!alertEmail && !alertPhone) {
    return res.status(400).json({ error: 'At least one of alertEmail or alertPhone is required' });
  }

  const appLabel = blockedApp || 'a blocked app';
  const presetLabel = presetName || 'your preset';
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const errors = [];

  // ── Email via SendGrid ──────────────────────────────────────────────────────
  if (alertEmail) {
    try {
      const msg = {
        to: alertEmail,
        from: { email: process.env.FROM_EMAIL, name: 'Scute' },
        subject: `Scute Alert: ${appLabel} was opened`,
        text: `${appLabel} was opened while the "${presetLabel}" block was active.\n\nTime: ${timestamp} UTC`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Verdana, Geneva, sans-serif; background-color: #28282B; border-radius: 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 400px; margin: 0 auto;">
              <tr>
                <td align="center" style="padding: 30px 20px 20px 20px;">
                  <p style="margin: 0 0 10px 0; font-size: 8px; color: #cccccc;">
                    ${appLabel} was opened during the "${presetLabel}" block:
                  </p>
                  <div style="font-size: 26px; font-weight: 700; letter-spacing: 8px; color: #ffffff; margin-bottom: 10px;">
                    Alert!
                  </div>
                  <p style="margin: 0 0 14px 0; font-size: 8px; color: #888888;">
                    ${timestamp} UTC
                  </p>
                  <p style="margin: 0 0 14px 0; font-size: 7px; color: #666666;">
                    If this wasn't you, your block preset is working as intended.
                  </p>
                  <p style="margin: 0; font-size: 7px; color: #555555;">
                    © 2026 Scute LLC
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };
      await sgMail.send(msg);
      console.log(`[preset-alert] Email sent to ${alertEmail} — app: ${appLabel}`);
    } catch (err) {
      console.error('[preset-alert] SendGrid error:', err.response?.body || err.message);
      errors.push('email');
    }
  }

  // ── SMS via Twilio ──────────────────────────────────────────────────────────
  // Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID in .env
  if (alertPhone) {
    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_MESSAGING_SERVICE_SID) {
        throw new Error('Twilio credentials not configured in .env');
      }
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        body: `Scute Alert — ${appLabel} was opened during your "${presetLabel}" block on ${timestamp} UTC.`,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: alertPhone.startsWith('+') ? alertPhone : `+1${alertPhone.replace(/\D/g, '')}`,
      });
      console.log(`[preset-alert] SMS sent to ${alertPhone} — app: ${appLabel}`);
    } catch (err) {
      console.error('[preset-alert] Twilio error:', err.message);
      errors.push('sms');
    }
  }

  if (errors.length > 0 && errors.length === [alertEmail, alertPhone].filter(Boolean).length) {
    return res.status(500).json({ error: 'Failed to send alerts', failed: errors });
  }

  res.json({ success: true, sent: { email: !!alertEmail && !errors.includes('email'), sms: !!alertPhone && !errors.includes('sms') } });
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
