import type { EntityManager } from 'typeorm';

const STORE_PROFILE_ORDER_LOCK_NAMESPACE = 'nestra.shopping-store-profile';

export async function lockStoreProfileOrder(
  entityManager: EntityManager,
  userId: string,
): Promise<void> {
  // One lock covers profile creation, reorder, and category append/removal.
  // Otherwise a reorder can commit a snapshot that drops a category created at the same time.
  await entityManager.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [
    STORE_PROFILE_ORDER_LOCK_NAMESPACE,
    userId,
  ]);
}

export async function appendCategoryToOwnedStoreProfiles(
  entityManager: EntityManager,
  userId: string,
  categoryId: string,
): Promise<void> {
  await lockStoreProfileOrder(entityManager, userId);
  await entityManager.query(
    `
      INSERT INTO shopping_store_profile_categories (profile_id, category_id, position)
      SELECT profile.id,
             $2,
             COALESCE((
               SELECT MAX(entry.position)
               FROM shopping_store_profile_categories AS entry
               WHERE entry.profile_id = profile.id
             ), -1) + 1
      FROM shopping_store_profiles AS profile
      WHERE profile.user_id = $1
    `,
    [userId, categoryId],
  );
}

export async function removeCategoryFromStoreProfiles(
  entityManager: EntityManager,
  userId: string,
  categoryId: string,
): Promise<void> {
  await lockStoreProfileOrder(entityManager, userId);
  const removedRows = await entityManager.query<Array<{ profile_id: string }>>(
    `
      DELETE FROM shopping_store_profile_categories
      WHERE category_id = $1
      RETURNING profile_id
    `,
    [categoryId],
  );
  const profileIds = [...new Set(removedRows.map((row) => row.profile_id))];

  if (profileIds.length === 0) {
    return;
  }

  await entityManager.query(
    `
      UPDATE shopping_store_profile_categories AS entry
      SET position = ranked.next_position,
          updated_at = now()
      FROM (
        SELECT id,
               (row_number() OVER (
                 PARTITION BY profile_id
                 ORDER BY position, id
               ) - 1)::int AS next_position
        FROM shopping_store_profile_categories
        WHERE profile_id = ANY($1::uuid[])
      ) AS ranked
      WHERE entry.id = ranked.id
        AND entry.position <> ranked.next_position
    `,
    [profileIds],
  );
}

export async function rememberSelectedStoreProfile(
  entityManager: EntityManager,
  userId: string,
  profileId: string,
): Promise<void> {
  await entityManager.query(
    `
      INSERT INTO shopping_store_preferences (user_id, last_selected_profile_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET last_selected_profile_id = EXCLUDED.last_selected_profile_id
    `,
    [userId, profileId],
  );
}
