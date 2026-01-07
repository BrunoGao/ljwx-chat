import { hashPassword } from '@/utils/server/password';

const password = 'Admin123!@#';

const hash = await hashPassword(password);
console.log('Password:', password);
console.log('Hash:', hash);
