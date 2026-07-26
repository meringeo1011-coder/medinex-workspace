import { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [hospitals, setHospitals] = useState([]);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const fetchHospitals = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/hospitals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHospitals(response.data);
    } catch (error) {
      console.error("Failed to fetch hospitals", error);
    }
  };

  useEffect(() => { fetchHospitals(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/hospitals/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`Hospital successfully marked as ${newStatus}!`);
      fetchHospitals(); // Refresh the lists instantly
      
      // Clear the success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update hospital status.');
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

  // Helper function to build a table so we don't repeat the same code 3 times
  const renderTable = (data, emptyMessage) => {
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
                  {/* Dynamic Action Buttons Based on Current Status */}
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

  return (
    <div className="mt-2 text-start">
      {message && <div className="alert alert-success fw-bold shadow-sm">{message}</div>}

      {/* Section 1: Pending Approvals */}
      <h4 className="text-primary border-bottom pb-2 mt-4 mb-3">Action Required (Pending)</h4>
      {renderTable(pendingHospitals, "No hospitals are currently waiting for approval.")}

      {/* Section 2: Approved / Present Hospitals */}
      <h4 className="text-success border-bottom pb-2 mt-5 mb-3">Active Hospitals Present</h4>
      {renderTable(approvedHospitals, "No active hospitals in the system.")}

      {/* Section 3: Rejected Hospitals */}
      <h4 className="text-danger border-bottom pb-2 mt-5 mb-3">Rejected / Removed Hospitals</h4>
      {renderTable(rejectedHospitals, "No rejected hospitals.")}
    </div>
  );
}

export default AdminDashboard;