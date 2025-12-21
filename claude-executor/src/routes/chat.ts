import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';

const router = Router();

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_turns?: number;
  system_prompt?: string;
}

function buildCliArgs(
  userMessage: string,
  model: string,
  maxTurns?: number,
  systemPrompt?: string,
  stream: boolean = true
): string[] {
  const args = ['-p', userMessage, '--model', model, '--dangerously-skip-permissions'];

  if (stream) {
    args.push('--output-format', 'stream-json', '--verbose');
  }

  if (maxTurns) {
    args.push('--max-turns', String(maxTurns));
  }

  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }

  return args;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, stream = true, max_turns, system_prompt } = req.body as ChatRequest;

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'Messages are required' });
      return;
    }

    // Model priority: request > env > default
    const model = req.body.model
      || process.env.CLAUDE_DEFAULT_MODEL
      || DEFAULT_MODEL;

    // Max turns: request > env
    const maxTurns = max_turns
      || (process.env.CLAUDE_MAX_TURNS ? parseInt(process.env.CLAUDE_MAX_TURNS, 10) : undefined);

    // System prompt: request > env
    const systemPrompt = system_prompt || process.env.CLAUDE_SYSTEM_PROMPT;

    const userMessage = messages[messages.length - 1].content;
    console.log('Chat request received:', { message: userMessage, model, maxTurns, systemPrompt: systemPrompt ? '***' : undefined });

    if (stream) {
      // SSE 流式响应
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const env = {
        ...process.env,
        HOME: process.env.HOME || '/root',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || undefined
      };

      console.log('Starting Claude Code with env:', {
        HOME: env.HOME,
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? '***' : 'not set',
        ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL
      });

      const args = buildCliArgs(userMessage, model, maxTurns, systemPrompt, true);
      console.log('Claude Code args:', args.map(a => a === systemPrompt ? '***' : a));

      const proc = spawn('claude', args, {
        cwd: '/vaults',
        stdio: ['inherit', 'pipe', 'pipe'],
        env: env as NodeJS.ProcessEnv
      });

      let fullOutput = '';

      proc.stdout?.on('data', (chunk: Buffer) => {
        fullOutput += chunk.toString();
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        console.error('Claude Code stderr:', chunk.toString());
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          console.error(`Claude Code exited with code ${code}`);
        }

        // 解析 JSON 结果并发送
        try {
          const event = JSON.parse(fullOutput.trim());
          if (event.type === 'result' && event.result) {
            const data = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: 'claude-code',
              choices: [{
                index: 0,
                delta: { content: event.result },
                finish_reason: null
              }]
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          }
        } catch (e) {
          // 非 JSON 输出直接发送
          if (fullOutput.trim()) {
            const data = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: 'claude-code',
              choices: [{
                index: 0,
                delta: { content: fullOutput },
                finish_reason: null
              }]
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          }
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
        HOME: process.env.HOME || '/root',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || undefined
      };

      const args = buildCliArgs(userMessage, model, maxTurns, systemPrompt, false);
      console.log('Claude Code args (non-stream):', args.map(a => a === systemPrompt ? '***' : a));

      const proc = spawn('claude', args, {
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
