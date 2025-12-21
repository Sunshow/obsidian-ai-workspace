import express from 'express';
import agentRouter from './routes/agent';

const app = express();
const PORT = process.env.AGENT_PORT || 3002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/agent', agentRouter);

app.listen(PORT, () => {
  console.log(`Agent service running on port ${PORT}`);
});
