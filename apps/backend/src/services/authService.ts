import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/errors.js';
import { signToken, type AuthUser } from '../middleware/auth.js';

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid email or password');
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  return { token: signToken(authUser), user: authUser };
}
