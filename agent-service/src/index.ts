import express from 'express';
import agentRouter from './routes/agent';
import chatRouter from './routes/chat';

const app = express();
const PORT = process.env.AGENT_PORT || 3002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/agent', agentRouter);
app.use('/v1/chat/completions', chatRouter);  // OpenAI 兼容路径
app.use('/api/chat', chatRouter);              // 简化路径

app.listen(PORT, () => {
  console.log(`Agent service running on port ${PORT}`);
});
