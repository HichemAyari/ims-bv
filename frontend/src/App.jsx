import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "/api";

export default function App() {
  const [inspections, setInspections] = useState([]);
  const [form, setForm] = useState({ site: "", inspection_date: "", findings: "" });

  async function load() {
    const { data } = await axios.get(`${API}/inspections`);
    setInspections(data);
  }
  useEffect(() => { load(); }, []);

  async function createInspection(e) {
    e.preventDefault();
    await axios.post(`${API}/inspections`, form);
    setForm({ site: "", inspection_date: "", findings: "" });
    load();
  }

  async function updateStatus(id, status) {
    await axios.put(`${API}/inspections/${id}/status`, { status });
    load();
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Inspection Management System</h1>
      <form onSubmit={createInspection} style={{ marginBottom: 20 }}>
        <input placeholder="Site" value={form.site} onChange={e=>setForm({...form,site:e.target.value})}/>
        <input type="date" value={form.inspection_date} onChange={e=>setForm({...form,inspection_date:e.target.value})}/>
        <input placeholder="Findings" value={form.findings} onChange={e=>setForm({...form,findings:e.target.value})}/>
        <button type="submit">Create</button>
      </form>
      <table border="1" cellPadding="8">
        <thead><tr><th>ID</th><th>Site</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {inspections.map(i=>(
            <tr key={i.id}>
              <td>{i.id}</td><td>{i.site}</td><td>{i.inspection_date?.slice(0,10)}</td><td>{i.status}</td>
              <td>
                <button onClick={()=>updateStatus(i.id,"Draft")}>Draft</button>
                <button onClick={()=>updateStatus(i.id,"UnderReview")}>Under Review</button>
                <button onClick={()=>updateStatus(i.id,"Approved")}>Approve</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{marginTop:20}}>Health: <a href="/health" target="_blank">/health</a> | Metrics: <a href="/metrics" target="_blank">/metrics</a></p>
    </div>
  );
}

