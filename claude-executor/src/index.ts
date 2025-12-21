import express from 'express';
import chatRouter from './routes/chat';

const app = express();
const PORT = process.env.AGENT_PORT || 3002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/v1/chat/completions', chatRouter);  // OpenAI 兼容路径
app.use('/api/chat', chatRouter);              // 简化路径

app.listen(PORT, () => {
  console.log(`Claude Code Executor running on port ${PORT}`);
});
