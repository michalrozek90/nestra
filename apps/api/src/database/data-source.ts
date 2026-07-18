import 'dotenv/config';

import { DataSource } from 'typeorm';

import { parseApiEnvironment } from '../config/api-environment';
import { createDatabaseOptions } from './database-options';

export const apiEnvironment = parseApiEnvironment(process.env);

export default new DataSource(createDatabaseOptions(apiEnvironment.databaseUrl));
