import React, { useEffect, useState } from 'react';
import api from '../services/api.js';
import { 
  Calendar,
  Save,
  Clock,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const Availability = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [availabilities, setAvailabilities] = useState({}); // mapped by dayOfWeek
  const [loading, setLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Local unsaved form state per day
  const [formState, setFormState] = useState({});

  useEffect(() => {
    const fetchDoctorsList = async () => {
      try {
        const res = await api.get('/doctors');
        if (res.data && res.data.success) {
          setDoctors(res.data.data.filter(d => d.isActive));
          if (res.data.data.length > 0) {
            setSelectedDoctorId(res.data.data[0]._id);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch active doctors.');
      } finally {
        setDoctorsLoading(false);
      }
    };
    fetchDoctorsList();
  }, []);

  const fetchAvailability = async (doctorId) => {
    if (!doctorId) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await api.get(`/availability/${doctorId}`);
      
      if (res.data && res.data.success) {
        const scheduleList = res.data.data;
        const scheduleMap = {};
        const stateMap = {};

        // Prepopulate maps
        scheduleList.forEach((item) => {
          scheduleMap[item.dayOfWeek] = item;
          stateMap[item.dayOfWeek] = {
            id: item._id,
            isActive: item.isActive,
            startTime: item.startTime,
            endTime: item.endTime,
            slotDuration: item.slotDuration,
            bufferTime: item.bufferTime,
          };
        });

        // Add defaults for missing days
        DAYS_OF_WEEK.forEach((day) => {
          if (!stateMap[day]) {
            stateMap[day] = {
              id: null,
              isActive: false,
              startTime: '09:00',
              endTime: '17:00',
              slotDuration: 30,
              bufferTime: 5,
            };
          }
        });

        setAvailabilities(scheduleMap);
        setFormState(stateMap);
      }
    } catch (err) {
      console.error(err);
      setError('Could not retrieve schedules details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId) {
      fetchAvailability(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  const handleToggleDay = (day) => {
    setFormState((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isActive: !prev[day].isActive,
      },
    }));
  };

  const handleInputChange = (day, field, value) => {
    setFormState((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: field === 'slotDuration' || field === 'bufferTime' ? Number(value) : value,
      },
    }));
  };

  const handleSaveDay = async (day) => {
    setError('');
    setSuccess('');
    const dayConfig = formState[day];

    // Validations
    if (dayConfig.slotDuration <= 0) {
      setError(`[${day.toUpperCase()}] Slot duration must be greater than 0.`);
      return;
    }

    const startMins = parseTimeToMinutes(dayConfig.startTime);
    const endMins = parseTimeToMinutes(dayConfig.endTime);

    if (startMins >= endMins) {
      setError(`[${day.toUpperCase()}] Start time must be before End time.`);
      return;
    }

    try {
      const payload = {
        doctorId: selectedDoctorId,
        dayOfWeek: day,
        startTime: dayConfig.startTime,
        endTime: dayConfig.endTime,
        slotDuration: dayConfig.slotDuration,
        bufferTime: dayConfig.bufferTime,
        isActive: dayConfig.isActive,
      };

      if (dayConfig.id) {
        // PUT update
        const res = await api.put(`/availability/${dayConfig.id}`, payload);
        if (res.data && res.data.success) {
          setSuccess(`Successfully updated configuration for ${day.toUpperCase()}`);
          fetchAvailability(selectedDoctorId);
        }
      } else {
        // POST create
        const res = await api.post('/availability', payload);
        if (res.data && res.data.success) {
          setSuccess(`Successfully created configuration for ${day.toUpperCase()}`);
          fetchAvailability(selectedDoctorId);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || `Failed to save configuration for ${day}`);
    }
  };

  const parseTimeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  if (doctorsLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading practitioners list...</p>
      </div>
    );
  }

  return (
    <div className="availability-page animate-fade-in">
      <div className="page-header-row">
        <div>
          <h2>Doctor Availability</h2>
          <p className="page-subtitle">Configure recurring weekly time windows and session durations</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={18} /><span>{error}</span></div>}
      {success && <div className="alert alert-success"><CheckCircle size={18} /><span>{success}</span></div>}

      {/* Doctor Selection Card */}
      <div className="content-card selector-card" style={{ marginBottom: '24px' }}>
        <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label htmlFor="doctorSelect" style={{ margin: 0, fontWeight: 500, fontSize: '15px' }}>
            Select Active Doctor:
          </label>
          {doctors.length === 0 ? (
            <span className="text-muted">No active doctors found. Please add active doctors first.</span>
          ) : (
            <select
              id="doctorSelect"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="form-control"
              style={{ width: '320px', padding: '8px 12px' }}
            >
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name} ({doc.specialization})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="spinner"></div>
          <p>Syncing schedule details...</p>
        </div>
      )}

      {/* Weekly Schedule Days Cards */}
      {!loading && selectedDoctorId && (
        <div className="weekly-schedule-container">
          {DAYS_OF_WEEK.map((day) => {
            const config = formState[day] || {
              id: null,
              isActive: false,
              startTime: '09:00',
              endTime: '17:00',
              slotDuration: 30,
              bufferTime: 5,
            };

            return (
              <div key={day} className={`schedule-day-card ${config.isActive ? 'active' : ''}`}>
                <div className="day-card-header">
                  <div className="day-title-wrapper">
                    <span className="day-name">{day.toUpperCase()}</span>
                    <span className={`status-pill ${config.isActive ? 'active' : ''}`}>
                      {config.isActive ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      className="ios-switch"
                      checked={config.isActive}
                      onChange={() => handleToggleDay(day)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <div className="day-card-body">
                  <div className="form-row">
                    <div className="form-group col-6">
                      <label>
                        <Clock size={14} style={{ marginRight: '4px' }} /> Start Time
                      </label>
                      <input
                        type="time"
                        value={config.startTime}
                        onChange={(e) => handleInputChange(day, 'startTime', e.target.value)}
                        disabled={!config.isActive}
                      />
                    </div>
                    <div className="form-group col-6">
                      <label>
                        <Clock size={14} style={{ marginRight: '4px' }} /> End Time
                      </label>
                      <input
                        type="time"
                        value={config.endTime}
                        onChange={(e) => handleInputChange(day, 'endTime', e.target.value)}
                        disabled={!config.isActive}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group col-6">
                      <label>Duration (Mins)</label>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={config.slotDuration}
                        onChange={(e) => handleInputChange(day, 'slotDuration', e.target.value)}
                        disabled={!config.isActive}
                      />
                    </div>
                    <div className="form-group col-6">
                      <label>Buffer (Mins)</label>
                      <input
                        type="number"
                        min="0"
                        value={config.bufferTime}
                        onChange={(e) => handleInputChange(day, 'bufferTime', e.target.value)}
                        disabled={!config.isActive}
                      />
                    </div>
                  </div>

                  <div className="day-card-actions">
                    <button
                      className="btn btn-save"
                      onClick={() => handleSaveDay(day)}
                    >
                      <Save size={16} />
                      <span>{config.id ? 'Update Schedule' : 'Create Schedule'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Availability;
