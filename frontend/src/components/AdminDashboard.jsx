import { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [hospitals, setHospitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pharmacists, setPharmacists] = useState([]);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchHospitals = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/hospitals', { headers });
      setHospitals(response.data);
    } catch (error) {
      console.error("Failed to fetch hospitals", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const [patientRes, pharmacistRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/users?role=Patient', { headers }),
        axios.get('http://localhost:5000/api/admin/users?role=Pharmacist', { headers }),
      ]);
      setPatients(patientRes.data);
      setPharmacists(pharmacistRes.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  useEffect(() => {
    fetchHospitals();
    fetchUsers();
  }, []);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/hospitals/${id}/status`, { status: newStatus }, { headers });
      showMessage(`Hospital successfully marked as ${newStatus}!`);
      fetchHospitals();
    } catch (error) {
      showMessage('Failed to update hospital status.');
    }
  };

  const handleUserToggle = async (id, isActive) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/users/${id}/status`, { is_active: isActive }, { headers });
      showMessage(isActive ? 'User restored.' : 'User removed.');
      fetchUsers();
    } catch (error) {
      showMessage('Failed to update user.');
    }
  };

  const getBadgeColor = (status) => {
    if (status === 'Approved') return 'bg-success';
    if (status === 'Rejected') return 'bg-danger';
    return 'bg-warning text-dark';
  };

  // Filter the hospitals into three distinct arrays
  const pendingHospitals = hospitals.filter(h => h.approval_status === 'Pending');
  const approvedHospitals = hospitals.filter(h => h.approval_status === 'Approved');
  const rejectedHospitals = hospitals.filter(h => h.approval_status === 'Rejected');

  // Helper function to build the hospital tables
  const renderHospitalTable = (data, emptyMessage) => {
    if (data.length === 0) return <div className="alert alert-light text-muted border">{emptyMessage}</div>;

    return (
      <div className="table-responsive mb-4">
        <table className="table table-bordered table-hover align-middle bg-white shadow-sm">
          <thead className="table-light">
            <tr>
              <th>Hospital Name</th>
              <th>Email</th>
              <th>License No.</th>
              <th>Status</th>
              <th>License Document</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map(hospital => (
              <tr key={hospital.id}>
                <td className="fw-bold">{hospital.name}</td>
                <td>{hospital.email}</td>
                <td>{hospital.license_number || 'N/A'}</td>
                <td>
                  <span className={`badge ${getBadgeColor(hospital.approval_status)} px-2 py-1`}>
                    {hospital.approval_status}
                  </span>
                </td>
                <td>
                  {hospital.license_file ? (
                    <a href={`http://localhost:5000/uploads/${hospital.license_file}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                      View Document
                    </a>
                  ) : (
                    <span className="text-muted small">No file</span>
                  )}
                </td>
                <td>
                  {hospital.approval_status === 'Pending' && (
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-success px-3" onClick={() => handleStatusChange(hospital.id, 'Approved')}>Approve</button>
                      <button className="btn btn-sm btn-danger px-3" onClick={() => handleStatusChange(hospital.id, 'Rejected')}>Reject</button>
                    </div>
                  )}
                  {hospital.approval_status === 'Approved' && (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleStatusChange(hospital.id, 'Rejected')}>
                      Remove Access
                    </button>
                  )}
                  {hospital.approval_status === 'Rejected' && (
                    <button className="btn btn-sm btn-outline-success" onClick={() => handleStatusChange(hospital.id, 'Approved')}>
                      Re-Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Helper function to build the Patient / Pharmacist tables
  const renderUserTable = (data, roleLabel, emptyMessage) => {
    if (data.length === 0) return <div className="alert alert-light text-muted border">{emptyMessage}</div>;

    return (
      <div className="table-responsive mb-4">
        <table className="table table-bordered table-hover align-middle bg-white shadow-sm">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Email</th>
              {roleLabel === 'Patient' && <th>Patient ID</th>}
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map(u => (
              <tr key={u.id}>
                <td className="fw-bold">{u.name}</td>
                <td>{u.email}</td>
                {roleLabel === 'Patient' && <td>{u.patient_unique_id || 'N/A'}</td>}
                <td>
                  <span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>
                    {u.is_active ? 'Active' : 'Removed'}
                  </span>
                </td>
                <td>
                  {u.is_active ? (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleUserToggle(u.id, false)}>Remove</button>
                  ) : (
                    <button className="btn btn-sm btn-outline-success" onClick={() => handleUserToggle(u.id, true)}>Restore</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="mt-2 text-start">
      {message && <div className="alert alert-success fw-bold shadow-sm">{message}</div>}

      {/* Section 1: Hospitals */}
      <h3 className="mb-3">Hospitals</h3>

      <h4 className="text-primary border-bottom pb-2 mt-4 mb-3">Action Required (Pending)</h4>
      {renderHospitalTable(pendingHospitals, "No hospitals are currently waiting for approval.")}

      <h4 className="text-success border-bottom pb-2 mt-5 mb-3">Active Hospitals Present</h4>
      {renderHospitalTable(approvedHospitals, "No active hospitals in the system.")}

      <h4 className="text-danger border-bottom pb-2 mt-5 mb-3">Rejected / Removed Hospitals</h4>
      {renderHospitalTable(rejectedHospitals, "No rejected hospitals.")}

      {/* Section 2: Other Users */}
      <h3 className="mt-5 mb-3">Other Users</h3>

      <h5 className="text-secondary border-bottom pb-2 mb-3">Patients</h5>
      {renderUserTable(patients, 'Patient', "No patients registered.")}

      <h5 className="text-secondary border-bottom pb-2 mb-3 mt-4">Pharmacists</h5>
      {renderUserTable(pharmacists, 'Pharmacist', "No pharmacists registered.")}
    </div>
  );
}

export default AdminDashboard;
