import localtunnel from 'localtunnel';

(async () => {
  try {
    const tunnel = await localtunnel({ port: 5000 });
    console.log(`\n==================================================`);
    console.log(`PUBLIC HTTPS TUNNEL URL: ${tunnel.url}`);
    console.log(`==================================================\n`);

    tunnel.on('close', () => {
      console.log('Localtunnel connection closed. Reconnecting...');
    });

    // Keep process alive indefinitely
    setInterval(() => {}, 60000);
  } catch (err) {
    console.error('Localtunnel error:', err);
  }
})();
