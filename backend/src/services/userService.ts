import supabase from '../config/supabase';
import logger from '../utils/logger';
import { SupportedCurrency } from './currencyService';

export interface UserProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  language_preference: string | null;
  currency_preference: SupportedCurrency;
  country_preference: string | null;
  created_at: string;
  updated_at: string | null;
}

// Cache for profiles to avoid redundant queries
const profileCache = new Map<string, { profile: UserProfile | null, timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Check if a profile exists for a user
 */
export async function profileExists(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('id', userId);

    if (error) {
      logger.error(`Error checking if profile exists for user ${userId}:`, error);
      throw new Error(`Error checking if profile exists: ${error.message}`);
    }

    return count !== null && count > 0;
  } catch (error) {
    logger.error(`Unexpected error checking if profile exists for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Fetch a user's profile by their ID
 */
export async function getUserProfile(userId: string, bypassCache = false): Promise<UserProfile | null> {
  try {
    // Check cache first if not bypassing
    const now = Date.now();
    if (!bypassCache && profileCache.has(userId)) {
      const cached = profileCache.get(userId)!;
      if (now - cached.timestamp < CACHE_TTL) {
        logger.info(`Using cached profile for user ${userId}`);
        return cached.profile;
      }
    }

    logger.info(`Fetching profile for user ${userId}`);

    // First check if the profile exists
    const exists = await profileExists(userId);
    if (!exists) {
      logger.info(`No profile found for user ${userId}`);

      // Update cache with null result
      profileCache.set(userId, { profile: null, timestamp: now });
      return null;
    }

    // Fetch the profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error(`Error fetching profile for user ${userId}:`, error);
      throw new Error(`Error fetching profile: ${error.message}`);
    }

    if (!data) {
      logger.info(`No profile data returned for user ${userId}`);

      // Update cache with null result
      profileCache.set(userId, { profile: null, timestamp: now });
      return null;
    }

    // Ensure the currency preference is a supported one, default to USD if not
    const profile = data as UserProfile;
    if (!Object.values(SupportedCurrency).includes(profile.currency_preference as SupportedCurrency)) {
      profile.currency_preference = SupportedCurrency.USD;
    }

    // Update cache
    profileCache.set(userId, { profile, timestamp: now });

    logger.info(`Successfully fetched profile for user ${userId}`);
    return profile;
  } catch (error) {
    logger.error(`Unexpected error fetching profile for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a profile for a user
 */
export async function createUserProfile(userId: string, initialData: Partial<UserProfile> = {}): Promise<UserProfile> {
  try {
    // First check if the profile already exists
    const exists = await profileExists(userId);
    if (exists) {
      logger.info(`Profile already exists for user ${userId}`);
      const profile = await getUserProfile(userId, true);
      if (profile) {
        return profile;
      }
    }

    logger.info(`Creating new profile for user ${userId}`);

    // Create default profile data
    const defaultProfileData = {
      id: userId,
      name: null,
      avatar_url: null,
      language_preference: 'en',
      currency_preference: SupportedCurrency.USD,
      country_preference: 'US',
      ...initialData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert the profile
    const { data, error } = await supabase
      .from('profiles')
      .insert([defaultProfileData])
      .select('*')
      .single();

    if (error) {
      logger.error(`Error creating profile for user ${userId}:`, error);
      throw new Error(`Error creating profile: ${error.message}`);
    }

    if (!data) {
      throw new Error(`No data returned after creating profile for user ${userId}`);
    }

    const profile = data as UserProfile;

    // Update cache
    profileCache.set(userId, {
      profile,
      timestamp: Date.now()
    });

    logger.info(`Successfully created profile for user ${userId}`);
    return profile;
  } catch (error) {
    logger.error(`Unexpected error creating profile for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update a user's profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    // First check if the profile exists - create it if it doesn't
    const exists = await profileExists(userId);
    if (!exists) {
      return createUserProfile(userId, updates);
    }

    // Ensure we're setting updated_at
    updates.updated_at = new Date().toISOString();

    logger.info(`Updating profile for user ${userId}`);

    // Update the profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      logger.error(`Error updating profile for user ${userId}:`, error);
      throw new Error(`Error updating profile: ${error.message}`);
    }

    if (!data) {
      throw new Error(`No data returned after updating profile for user ${userId}`);
    }

    const profile = data as UserProfile;

    // Update cache
    profileCache.set(userId, {
      profile,
      timestamp: Date.now()
    });

    logger.info(`Successfully updated profile for user ${userId}`);
    return profile;
  } catch (error) {
    logger.error(`Unexpected error updating profile for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update a user's currency preference
 */
export async function updateUserCurrency(
  userId: string,
  currency: SupportedCurrency
): Promise<UserProfile> {
  return updateUserProfile(userId, { currency_preference: currency });
}

/**
 * Clear the profile cache
 */
export function clearProfileCache(): void {
  profileCache.clear();
}

export default {
  profileExists,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  updateUserCurrency,
  clearProfileCache,
};