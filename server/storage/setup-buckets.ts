/**
 * STORAGE BUCKETS SETUP SCRIPT
 *
 * Run this script to initialize Supabase Storage buckets
 * and configure RLS policies.
 */

import { initializeStorageBuckets } from './supabase-client';

async function setup() {
  console.log('🚀 Initializing Supabase Storage buckets...\n');

  try {
    await initializeStorageBuckets();
    console.log('\n✅ Storage buckets initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify buckets in Supabase Dashboard');
    console.log('2. Configure RLS policies if needed');
    console.log('3. Set up CDN (optional)');
    console.log('4. Configure CORS settings');
    console.log('\nBuckets created:');
    console.log('  • properties-images (public)');
    console.log('  • avatars (public)');
    console.log('  • logos (public)');
    console.log('  • documents (private)');
    console.log('  • invoices (private)');
    console.log('  • exports (private, temporary)');
  } catch (error) {
    console.error('❌ Failed to initialize buckets:', error);
    process.exit(1);
  }
}

setup();
