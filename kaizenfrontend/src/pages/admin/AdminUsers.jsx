import { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import DataTable from './components/DataTable';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ clients: 0, professionals: 0, admins: 0 });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await API.get('/admin/users');
      setUsers(response.data);
      
      // Calculate stats
      const clients = response.data.filter(u => u.role === 'Client').length;
      const professionals = response.data.filter(u => u.role === 'Professional').length;
      const admins = response.data.filter(u => u.role === 'Admin').length;
      setStats({ clients, professionals, admins });
    } catch (err) {
      console.error(err);
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch(role) {
      case 'Admin':
        return { background: '#EEEDFE', color: '#3C3489' };
      case 'Professional':
        return { background: '#E1F5EE', color: '#085041' };
      default:
        return { background: '#FAEEDA', color: '#633806' };
    }
  };

  const columns = [
    { key: 'fullName', label: 'Name', align: 'left' },
    { key: 'email', label: 'Email', align: 'left' },
    { 
      key: 'role', 
      label: 'Role', 
      align: 'center',
      render: (value) => {
        const style = getRoleBadgeStyle(value);
        return (
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: style.background,
            color: style.color
          }}>
            {value}
          </span>
        );
      }
    },
    { 
      key: 'dateRegistered', 
      label: 'Registered', 
      align: 'left', 
      render: (value) => new Date(value).toLocaleDateString() 
    }
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Loading users...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>User Management</h2>
      <p style={{ color: '#718096', marginBottom: 24 }}>View all platform users and their roles</p>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Total Clients" value={stats.clients} color="purple" icon="👥" />
        <StatsCard title="Professionals" value={stats.professionals} color="green" icon="👨‍⚕️" />
        <StatsCard title="Admins" value={stats.admins} color="orange" icon="👑" />
      </div>

      <DataTable columns={columns} data={users} />
    </div>
  );
}