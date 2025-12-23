import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Container,
  Paper,
  TextField,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

const API_BASE = "http://localhost:8000/api/appointments";

const DAYS = [
  { label: "Monday", value: 0 },
  { label: "Tuesday", value: 1 },
  { label: "Wednesday", value: 2 },
  { label: "Thursday", value: 3 },
  { label: "Friday", value: 4 },
  { label: "Saturday", value: 5 },
  { label: "Sunday", value: 6 },
];

const WORKING_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

function App() {
  const emptyForm = {
    patient_name: "",
    day_label: "",
    day_of_week: "",
    month: "",
    hour: "",
    days_between_schedule_and_visit: "",
    sex_label: "",
    sex_encoded: "",
    age: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [appointments, setAppointments] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterName, setFilterName] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(API_BASE);
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      alert("Error loading appointments");
    }
  };

  const handleChangeText = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeNumber = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? "" : Number(value),
    }));
  };

  const handleDayChange = (e) => {
    const value = e.target.value;
    const dayObj = DAYS.find((d) => d.value === value);
    setForm((prev) => ({
      ...prev,
      day_of_week: value,
      day_label: dayObj ? dayObj.label : "",
    }));
  };

  const handleSexChange = (e) => {
    const label = e.target.value;
    const encoded = label === "male" ? 1 : 0;
    setForm((prev) => ({
      ...prev,
      sex_label: label,
      sex_encoded: encoded,
    }));
  };

  const handleHourChange = (e) => {
    const value = Number(e.target.value);
    setForm((prev) => ({
      ...prev,
      hour: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      patient_name: form.patient_name,
      day_of_week: form.day_of_week,
      month: form.month,
      hour: form.hour,
      days_between_schedule_and_visit: form.days_between_schedule_and_visit,
      sex_encoded: form.sex_encoded,
      age: form.age,
    };

    try {
      if (editingId === null) {
        // إنشاء موعد جديد
        const res = await axios.post(API_BASE, payload);
        const data = res.data;

        setAppointments((prev) => [...prev, data]);

        // لو الباك إند رجّع ساعة أفضل مختلفة عن الحالية
        if (
          data.best_local_hour !== undefined &&
          data.best_local_hour !== null &&
          data.best_local_hour !== data.hour
        ) {
          alert(
            `Current hour: ${data.hour}:00\n` +
              `Waiting now: ${data.predicted_waiting_time.toFixed(
                1
              )} min\n` +
              `Better nearby hour: ${data.best_local_hour}:00 with ${data.best_local_wait.toFixed(
                1
              )} min`
          );
        }
      } else {
        // تعديل موعد قديم
        await axios.put(`${API_BASE}/${editingId}`, payload);
        await fetchAppointments();
      }

      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Error saving appointment");
    }
  };

  const startEdit = (appt) => {
    const dayObj = DAYS.find((d) => d.value === appt.day_of_week);
    const sexLabel = appt.sex_encoded === 1 ? "male" : "female";

    setEditingId(appt.id);
    setForm({
      patient_name: appt.patient_name,
      day_label: dayObj ? dayObj.label : "",
      day_of_week: appt.day_of_week,
      month: appt.month,
      hour: appt.hour,
      days_between_schedule_and_visit: appt.days_between_schedule_and_visit,
      sex_label: sexLabel,
      sex_encoded: appt.sex_encoded,
      age: appt.age,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await axios.delete(`${API_BASE}/${id}`);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Error deleting appointment");
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchDay =
        filterDay === "" || a.day_of_week === Number(filterDay);
      const matchMonth =
        filterMonth === "" || a.month === Number(filterMonth);
      const matchName =
        filterName.trim() === "" ||
        a.patient_name.toLowerCase().includes(filterName.toLowerCase());
      return matchDay && matchMonth && matchName;
    });
  }, [appointments, filterDay, filterMonth, filterName]);

  const stats = useMemo(() => {
    if (appointments.length === 0) {
      return { count: 0, avgWait: 0, maxWait: 0 };
    }
    const waits = appointments.map(
      (a) => Number(a.predicted_waiting_time) || 0
    );
    const count = appointments.length;
    const avgWait = waits.reduce((s, v) => s + v, 0) / waits.length;
    const maxWait = Math.max(...waits);
    return {
      count,
      avgWait: Number(avgWait.toFixed(1)),
      maxWait,
    };
  }, [appointments]);

  const HIGH_WAIT_THRESHOLD = 30;

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Clinic Appointments
      </Typography>

      {/* Dashboard */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Paper sx={{ p: 2, flex: 1, minWidth: 180 }}>
          <Typography variant="subtitle2">Total Appointments</Typography>
          <Typography variant="h5">{stats.count}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 180 }}>
          <Typography variant="subtitle2">Average Waiting Time</Typography>
          <Typography variant="h5">{stats.avgWait} min</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 180 }}>
          <Typography variant="subtitle2">Max Waiting Time</Typography>
          <Typography variant="h5">{stats.maxWait} min</Typography>
        </Paper>
      </Box>

      {/* Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {editingId === null ? "Add New Appointment" : "Edit Appointment"}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Patient Name"
                name="patient_name"
                fullWidth
                value={form.patient_name}
                onChange={handleChangeText}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Day of Week</InputLabel>
                <Select
                  label="Day of Week"
                  value={form.day_of_week}
                  onChange={handleDayChange}
                >
                  {DAYS.map((d) => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Month (1-12)"
                name="month"
                type="number"
                fullWidth
                value={form.month}
                onChange={handleChangeNumber}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Hour</InputLabel>
                <Select
                  label="Hour"
                  value={form.hour}
                  onChange={handleHourChange}
                >
                  {WORKING_HOURS.map((h) => (
                    <MenuItem key={h} value={h}>
                      {h}:00
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Days Between"
                name="days_between_schedule_and_visit"
                type="number"
                fullWidth
                value={form.days_between_schedule_and_visit}
                onChange={handleChangeNumber}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Sex</InputLabel>
                <Select
                  label="Sex"
                  value={form.sex_label}
                  onChange={handleSexChange}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Age"
                name="age"
                type="number"
                fullWidth
                value={form.age}
                onChange={handleChangeNumber}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="primary" fullWidth>
                {editingId === null ? "Add Appointment" : "Save Changes"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Filters + Table */}
      <Paper sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">All Appointments</Typography>
          <TextField
            label="Filter by Name"
            size="small"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <TextField
            label="Filter by Day (value)"
            type="number"
            size="small"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
          />
          <TextField
            label="Filter by Month"
            type="number"
            size="small"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
          <Button
            onClick={() => {
              setFilterDay("");
              setFilterMonth("");
              setFilterName("");
            }}
          >
            Clear Filters
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Day</TableCell>
              <TableCell>Month</TableCell>
              <TableCell>Hour</TableCell>
              <TableCell>Days Between</TableCell>
              <TableCell>Sex</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Predicted Waiting</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAppointments.map((a) => {
              const dayObj = DAYS.find((d) => d.value === a.day_of_week);
              const sexLabel = a.sex_encoded === 1 ? "Male" : "Female";
              const highWait =
                Number(a.predicted_waiting_time) > HIGH_WAIT_THRESHOLD;

              return (
                <TableRow
                  key={a.id}
                  sx={{
                    backgroundColor: highWait
                      ? "rgba(255, 99, 71, 0.1)"
                      : "inherit",
                  }}
                >
                  <TableCell>{a.id}</TableCell>
                  <TableCell>{a.patient_name}</TableCell>
                  <TableCell>{dayObj ? dayObj.label : a.day_of_week}</TableCell>
                  <TableCell>{a.month}</TableCell>
                  <TableCell>{a.hour}:00</TableCell>
                  <TableCell>{a.days_between_schedule_and_visit}</TableCell>
                  <TableCell>{sexLabel}</TableCell>
                  <TableCell>{a.age}</TableCell>
                  <TableCell>
                    {a.predicted_waiting_time}
                    {highWait && (
                      <span style={{ color: "red", marginLeft: 4 }}>
                        (Long wait, suggest another hour)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => startEdit(a)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(a.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredAppointments.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No appointments match filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}

export default App;
