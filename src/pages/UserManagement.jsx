import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './UserManagement.css';

const MASTER_PASSWORD = "andscene_master";

export default function UserManagement() {
  const { user, fetchAllUsers, updateUser, deleteUser, resetUserPassword } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUserId, setEditUserId] = useState(null);
  const [editData, setEditData] = useState({ name: '', avatar_url: '', email: '', isAdmin: false });
  const [masterPass, setMasterPass] = useState('');
  const [authorized, setAuthorized] = useState(false);

  // If not authorized, show master password prompt
  if (!authorized) {
    return (
      <div className="user-management-page">
        <Navbar />
        <div className="um-container glass" style={{ maxWidth: '400px', margin: 'auto', padding: '2rem' }}>
          <h2>Master Password Required</h2>
          <input
            type="password"
            placeholder="Enter master password"
            value={masterPass}
            onChange={(e) => setMasterPass(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              if (masterPass === MASTER_PASSWORD) {
                setAuthorized(true);
                setMasterPass('');
              } else {
                alert('Invalid master password');
              }
            }}
          >
            Unlock User Management
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const startEdit = (usr) => {
    setEditUserId(usr.id);
    setEditData({ name: usr.name, avatar_url: usr.avatar_url, email: usr.email, isAdmin: usr.is_admin });
  };

  const cancelEdit = () => {
    setEditUserId(null);
    setEditData({ name: '', avatar_url: '', email: '', isAdmin: false });
  };

  const handleSave = async () => {
    await updateUser(editUserId, editData);
    const refreshed = await fetchAllUsers();
    setUsers(refreshed || []);
    cancelEdit();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this user? This action cannot be undone.')) {
      await deleteUser(id);
      const refreshed = await fetchAllUsers();
      setUsers(refreshed || []);
    }
  };

  const handleResetPassword = async (email) => {
    await resetUserPassword(email);
    alert('Password reset email sent.');
  };

  return (
    <div className="user-management-page">
      <Navbar />
      <div className="um-container glass">
        <h1>👥 User Management</h1>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className="um-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Avatar</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {editUserId === u.id ? (
                      <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                    ) : (
                      u.name
                    )}
                  </td>
                  <td>
                    {editUserId === u.id ? (
                      <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td>
                    {editUserId === u.id ? (
                      <input value={editData.avatar_url} onChange={(e) => setEditData({ ...editData, avatar_url: e.target.value })} />
                    ) : (
                      <img src={u.avatar_url} alt="avatar" className="avatar-thumb" />
                    )}
                  </td>
                  <td>
                    {editUserId === u.id ? (
                      <input type="checkbox" checked={editData.isAdmin} onChange={(e) => setEditData({ ...editData, isAdmin: e.target.checked })} />
                    ) : (u.is_admin ? 'Yes' : 'No')}
                  </td>
                  <td>
                    {editUserId === u.id ? (
                      <>
                        <button onClick={handleSave} className="btn btn-primary btn-sm">Save</button>
                        <button onClick={cancelEdit} className="btn btn-secondary btn-sm">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(u)} className="btn btn-primary btn-sm">Edit</button>
                        <button onClick={() => handleDelete(u.id)} className="btn btn-danger btn-sm">Delete</button>
                        <button onClick={() => handleResetPassword(u.email)} className="btn btn-warning btn-sm">Reset PW</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Footer />
    </div>
  );
}
