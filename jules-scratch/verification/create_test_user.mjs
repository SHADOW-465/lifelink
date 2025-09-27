import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Supabase URL or Service Role Key is missing. Make sure .env is loaded.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUser = {
  email: 'test.user.jules@example.com',
  password: 'password123',
};

async function createUser() {
  console.log(`Attempting to create user: ${testUser.email}`);

  // First, check if the user already exists and delete them to ensure a clean state
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }

  const existingUser = users.find(u => u.email === testUser.email);
  if (existingUser) {
    console.log('User already exists. Deleting user to ensure clean state...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    if (deleteError) {
      console.error('Error deleting existing user:', deleteError.message);
      return;
    }
    console.log('Existing user deleted.');
  }

  // Create the new user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: testUser.email,
    password: testUser.password,
    email_confirm: true, // Auto-confirm the email for testing purposes
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('Successfully created and confirmed test user:');
    console.log(data.user);
  }
}

createUser();