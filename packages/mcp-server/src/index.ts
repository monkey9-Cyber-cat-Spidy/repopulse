import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRepopulseServer } from './server.js';

export * from './server.js';

export async function runServer(): Promise<void> {
  const server = createRepopulseServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[RepoPulse MCP Server] Connected via stdio transport.');
}

// Auto-run if executed as main module via CLI flag
if (process.env.REPOPULSE_MCP_AUTORUN === 'true') {
  runServer().catch((err) => {
    console.error('[RepoPulse MCP Server Fatal Error]:', err);
    process.exit(1);
  });
}
