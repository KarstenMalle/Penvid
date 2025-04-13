import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Missing Supabase environment variables');
  throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

// Create a Supabase client with the service role key
// This should bypass Row Level Security
const supabase = createClient(supabaseUrl, supabaseServiceKey);

logger.info('Supabase client initialized');

export default supabase;