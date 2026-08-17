export interface AuthResult {
  token: string;
  user: { userId: number; username: string; role: string };
}

export interface AuthService {
  login(username: string, password: string): Promise<AuthResult | null>;
  register(username: string, password: string): Promise<AuthResult | null>;
}

export const authService: AuthService = {
  async login(username, password) {
    const { adminLogin } = await import('../../../lib/service/auth/admin');
    return adminLogin(username, password);
  },
  async register(username, password) {
    const { adminRegister } = await import('../../../lib/service/auth/admin');
    return adminRegister(username, password);
  },
};
