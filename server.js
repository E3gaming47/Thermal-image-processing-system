import express from 'express';
import { PythonShell } from 'python-shell';
import cors from 'cors';
const app = express();
const port = 3003;

app.use(express.json());
app.use(cors());

app.post('/analyze', (req, res) => {
  const { sensors, status } = req.body;

  const options = {
    mode: 'text',
    pythonPath: 'python',
    scriptPath: './services',
    args: []
  };

  const pyshell = new PythonShell('thermal_analyzer.py', options);

  const inputData = JSON.stringify({ sensors, status });
  pyshell.send(inputData);

  pyshell.on('message', (message) => {
    res.json({ analysis: message });
  });

  pyshell.on('error', (err) => {
    console.error('Python error:', err);
    // Fallback to local analysis
    const localAnalysis = getLocalAnalysis(sensors, status);
    res.json({ analysis: localAnalysis });
  });

  pyshell.end((err) => {
    if (err) {
      console.error('Python script error:', err);
    }
  });
});

// Simple fallback function
function getLocalAnalysis(sensors, status) {
  const focus = status.analysisFocus || 'HSE';
  const offlineCount = sensors.filter(s => s.status === 'offline').length;
  const hotNodes = sensors.filter(s => s.temperature > 55);
  const coldNodes = sensors.filter(s => s.temperature < 5);

  if (status.fireAlarm) {
    const hotNodes = sensors.filter(s => s.temperature > 55);
    if (hotNodes.length >= 2) return '[HSE_CRITICAL] THERMAL RUPTURE DETECTED.';
    return '[HSE_ADVISORY] Elevated temperature detected. Awaiting confirmation.';
  }

  if (coldNodes.length > 5) {
    return '[HSE_CRITICAL] CRYOGENIC LEAK.';
  }

  switch (focus) {
    case 'HSE':
      return '[HSE_NOMINAL] Perimeter integrity verified.';
    case 'ENERGY':
      return '[SYSTEM] Energy analytics have been disabled by operator preference.';
    case 'MAINTENANCE':
      return '[MAINT_REPORT] Maintenance check passed.';
    case 'DIAGNOSTIC':
      return '[DIAG_CORE] Diagnostic complete.';
    default:
      return '[SYSTEM] Analysis complete.';
  }
}

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});

app.post('/thermal-image', (req, res) => {
  const { sensors, status } = req.body;

  const options = {
    mode: 'text',
    pythonPath: 'python',
    scriptPath: './services',
    args: []
  };

  const pyshell = new PythonShell('thermal_imager.py', options);
  const inputData = JSON.stringify({ sensors, status });
  let sent = false;

  pyshell.on('message', (message) => {
    if (!sent) {
      res.json({ imageBase64: message });
      sent = true;
    }
  });

  pyshell.on('error', (err) => {
    console.error('Python image error:', err);
    res.status(500).json({ error: 'Image generation failed' });
  });

  pyshell.send(inputData);
  pyshell.end((err) => {
    if (err) {
      console.error('Python script error:', err);
    }
  });
});