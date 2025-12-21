import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';

const router = Router();

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, stream = true } = req.body as ChatRequest;

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'Messages are required' });
      return;
    }

    const userMessage = messages[messages.length - 1].content;
    console.log('Chat request received:', userMessage);

    if (stream) {
      // SSE 流式响应
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const env = {
        ...process.env,
        HOME: '/config',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || undefined
      };

      console.log('Starting Claude Code with env:', {
        HOME: env.HOME,
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? '***' : 'not set',
        ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL
      });

      // 调用 Claude Code CLI - 关键：stdin 用 inherit
      const proc = spawn('claude', ['-p', userMessage], {
        cwd: '/vaults',
        stdio: ['inherit', 'pipe', 'pipe'],
        env: env as NodeJS.ProcessEnv
      });

      proc.stdout?.on('data', (chunk: Buffer) => {
        const content = chunk.toString();
        const data = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: 'claude-code',
          choices: [{
            index: 0,
            delta: { content },
            finish_reason: null
          }]
        };
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        console.error('Claude Code stderr:', chunk.toString());
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          console.error(`Claude Code exited with code ${code}`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      });

      proc.on('error', (err) => {
        console.error('Claude Code error:', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      });

    } else {
      // 非流式响应
      const env = {
        ...process.env,
        HOME: '/config',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || undefined
      };

      const proc = spawn('claude', ['-p', userMessage], {
        cwd: '/vaults',
        stdio: ['inherit', 'pipe', 'pipe'],
        env: env as NodeJS.ProcessEnv
      });

      let output = '';
      let errorOutput = '';

      proc.stdout?.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        errorOutput += chunk.toString();
        console.error('Claude Code stderr:', chunk.toString());
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          res.status(500).json({
            error: {
              message: errorOutput || `Claude Code exited with code ${code}`,
              type: 'claude_code_error',
              code: code
            }
          });
          return;
        }

        res.json({
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'claude-code',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: output
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          }
        });
      });

      proc.on('error', (err) => {
        res.status(500).json({
          error: {
            message: err.message,
            type: 'claude_code_error'
          }
        });
      });
    }
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'internal_error'
      }
    });
  }
});

export default router;
