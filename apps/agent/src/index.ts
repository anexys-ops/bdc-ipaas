#!/usr/bin/env node
import { Command } from 'commander';
import { AgentService } from './service/agent.service';
import { createLogger, format, transports } from 'winston';
import Conf from 'conf';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)),
  transports: [new transports.Console(), new transports.File({ filename: 'agent.log' })],
});

const config = new Conf({ projectName: 'anexys-agent' });
const program = new Command();

program
  .name('anexys-agent')
  .description('ANEXYS iPaaS Desktop Agent')
  .version('1.0.0');

program
  .command('configure')
  .description('Configurer l\'agent')
  .option('-s, --server <url>', 'URL du serveur WebSocket')
  .option('-t, --token <token>', 'Token d\'authentification')
  .option('-w, --watch <paths...>', 'Répertoires à surveiller')
  .action((options) => {
    if (options.server) config.set('serverUrl', options.server);
    if (options.token) config.set('token', options.token);
    if (options.watch) config.set('watchPaths', options.watch);
    logger.info('Configuration mise à jour');
    console.log('Configuration actuelle:', { serverUrl: config.get('serverUrl'), watchPaths: config.get('watchPaths') });
  });

program
  .command('start')
  .description('Démarrer l\'agent')
  .action(async () => {
    const serverUrl = config.get('serverUrl') as string;
    const token = config.get('token') as string;
    const watchPaths = config.get('watchPaths') as string[] || [];

    if (!serverUrl || !token) {
      console.error('Configuration manquante. Utilisez: anexys-agent configure -s <url> -t <token>');
      process.exit(1);
    }

    logger.info(`Démarrage de l'agent...`);
    logger.info(`Serveur: ${serverUrl}`);
    logger.info(`Répertoires surveillés: ${watchPaths.join(', ')}`);

    const agent = new AgentService(serverUrl, token, watchPaths, logger);
    await agent.start();
    
    process.on('SIGINT', async () => {
      logger.info('Arrêt de l\'agent...');
      await agent.stop();
      process.exit(0);
    });
  });

program
  .command('status')
  .description('Afficher le status')
  .action(() => {
    console.log({ serverUrl: config.get('serverUrl'), watchPaths: config.get('watchPaths'), configured: !!config.get('token') });
  });

program.parse(process.argv);
