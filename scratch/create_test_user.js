const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTestUser() {
  const email = 'test_user_' + Date.now() + '@example.com';
  const password = 'password123!';
  
  console.log(`[INFO] Creating test user: ${email}`);
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { full_name: 'Test Administrator' }
  });

  if (error) {
    console.error('[ERROR] Failed to create user:', error.message);
  } else {
    console.log('[SUCCESS] User created successfully!');
    console.log('-----------------------------------');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------');
  }
}

createTestUser();
