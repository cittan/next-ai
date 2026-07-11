import { signToken, verifyToken, extractToken, JwtPayload } from './jwt';

function runTests() {
  console.log('=== JWT 服务测试 ===');

  // 测试 1：签发 token
  const payload: JwtPayload = { userId: 1, username: 'testuser', role: 'admin' };
  const token = signToken(payload);
  console.assert(typeof token === 'string' && token.length > 0, 'token 应该是非空字符串');
  console.log('✓ Token 签发成功:', token.substring(0, 50) + '...');

  // 测试 2：验证 token
  const decoded = verifyToken(token);
  console.assert(decoded !== null, '验证应该成功');
  console.assert(decoded!.userId === payload.userId, 'userId 应该匹配');
  console.assert(decoded!.username === payload.username, 'username 应该匹配');
  console.assert(decoded!.role === payload.role, 'role 应该匹配');
  console.log('✓ Token 验证成功，解析的载荷:', decoded);

  // 测试 3：验证无效 token
  const invalid = verifyToken('invalid.token.here');
  console.assert(invalid === null, '无效 token 应该返回 null');
  console.log('✓ 无效 token 验证正确返回 null');

  // 测试 4：提取 Bearer token
  const authHeader = 'Bearer ' + token;
  const extracted = extractToken(authHeader);
  console.assert(extracted === token, '应该正确提取 token');
  console.log('✓ Bearer token 提取成功');

  // 测试 5：提取无效格式
  console.assert(extractToken(null) === null, 'null 头应该返回 null');
  console.assert(extractToken('') === null, '空字符串应该返回 null');
  console.assert(extractToken('InvalidFormat') === null, '无效格式应该返回 null');
  console.assert(extractToken('Basic abc123') === null, '非 Bearer 格式应该返回 null');
  console.log('✓ 无效格式提取测试通过');

  console.log('\n所有测试通过！');
}

runTests();