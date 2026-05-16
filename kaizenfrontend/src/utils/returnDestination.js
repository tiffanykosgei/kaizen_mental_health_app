export function getReturnDestination() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    if (sessionStorage.getItem('kaizenWelcomeReturn') === 'bottom') {
      return { path: '/#welcome-bottom', label: 'Back to Welcome Page' };
    }

    return { path: '/', label: 'Back to Welcome Page' };
  }

  if (role === 'Admin') {
    return { path: '/dashboard', label: 'Back to Admin Dashboard' };
  }

  if (role === 'Professional') {
    return { path: '/dashboard', label: 'Back to Professional Dashboard' };
  }

  if (role === 'Client') {
    return { path: '/dashboard', label: 'Back to Client Dashboard' };
  }

  return { path: '/', label: 'Back to Welcome Page' };
}
