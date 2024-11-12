export function verifyUserCredentials(email: string, password: string) {
  const mockUser = { email: 'm@example.com', password: 'password123' }
  return email === mockUser.email && password === mockUser.password
}
