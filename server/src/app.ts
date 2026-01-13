import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import SqliteStore from 'better-sqlite3-session-store';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import propertiesRouter from './routes/properties.js';
import eventsRouter from './routes/events.js';
import tenantsRouter from './routes/tenants.js';
import documentsRouter from './routes/documents.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api', limiter);

  // Session middleware with SQLite store
  const SessionStore = SqliteStore(session);
  const sessionDb = new Database(path.join(__dirname, '../../data/sessions.db'));

  app.use(
    session({
      store: new SessionStore({
        client: sessionDb,
        expired: {
          clear: true,
          intervalMs: 900000, // 15 minutes
        },
      }),
      secret: process.env.SESSION_SECRET || 'change-this-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.use('/api/auth', authRouter);

  // Properties routes
  app.use('/api/properties', propertiesRouter);

  // Events routes
  app.use('/api/events', eventsRouter);

  // Tenants routes
  app.use('/api/tenants', tenantsRouter);

  // Documents routes
  app.use('/api/documents', documentsRouter);

  return app;
}
