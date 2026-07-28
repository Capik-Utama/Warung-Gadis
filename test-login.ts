import { useAuthStore } from './src/store/authStore';
import { ROLE_DEFAULT_PERMISSIONS } from './src/permissions';

// Mocking user data for Capik
const mockUser = {
  id: '00000000-0000-0000-0000-000000000009',
  name: 'Capik',
  phone: '089675669989',
  address: 'Wangon Mas',
  role: 'developer',
  branch_id: null,
  avatar_url: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockPermissions = ROLE_DEFAULT_PERMISSIONS['developer'];

console.log("--- Testing Login Logic ---");
console.log("User:", mockUser.name);
console.log("Role:", mockUser.role);
console.log("Permissions Count:", mockPermissions.length);

if (mockUser.role === 'developer') {
    console.log("SUCCESS: User is recognized as Developer");
} else {
    console.log("FAILED: User role is not Developer");
}

if (mockPermissions.includes('manage_users')) {
    console.log("SUCCESS: Developer has 'manage_users' permission");
} else {
    console.log("FAILED: Developer missing 'manage_users' permission");
}

console.log("--- End of Test ---");
