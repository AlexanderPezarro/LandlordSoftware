import authService from '../services/auth.service.js';

async function createUser() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';

  try {
    const user = await authService.createUser(email, password);
    console.log('✅ User created successfully:', user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ User already exists with this email');
    } else {
      console.error('❌ Error creating user:', error);
    }
  }
  process.exit(0);
}

createUser();
