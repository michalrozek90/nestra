export {
  APPLICATION_NAME,
  applicationMetadata,
  applicationMetadataSchema,
  applicationVersion,
  type ApplicationMetadata,
} from './application-metadata.schema';
export {
  API_ERROR_CODES,
  apiErrorCodeSchema,
  apiErrorResponseSchema,
  validationIssueSchema,
  type ApiErrorCode,
  type ApiErrorResponse,
  type ValidationIssue,
} from './common/api-error.schema';
export { healthResponseSchema, type HealthResponse } from './health/health-response.schema';
export {
  authenticationSessionResponseSchema,
  type AuthenticationSessionResponse,
} from './auth/authentication-session-response.schema';
export { loginRequestSchema, type LoginRequest } from './auth/login.schema';
export {
  logoutRequestSchema,
  refreshRequestSchema,
  type LogoutRequest,
  type RefreshRequest,
} from './auth/refresh-session.schema';
export { registerRequestSchema, type RegisterRequest } from './auth/register.schema';
export { publicUserSchema, type PublicUser } from './auth/public-user.schema';
export {
  externalIdentityResponseSchema,
  googleAuthExchangeRequestSchema,
  googleAuthPlatformSchema,
  googleAuthStartRequestSchema,
  googleAuthStartResponseSchema,
  googleLinkStartRequestSchema,
  type ExternalIdentityResponse,
  type GoogleAuthExchangeRequest,
  type GoogleAuthPlatform,
  type GoogleAuthStartRequest,
  type GoogleAuthStartResponse,
  type GoogleLinkStartRequest,
} from './auth/google-auth.schema';
export { createNoteSchema, type CreateNote } from './notes/create-note.schema';
export {
  emptyTrashResponseSchema,
  type EmptyTrashResponse,
} from './notes/empty-trash-response.schema';
export { noteListSchema, type NoteList } from './notes/note-list.schema';
export {
  deriveNoteTitle,
  normalizeNoteDocument,
  NOTE_DOCUMENT_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  noteDocumentSchema,
  normalizedNoteDocumentSchema,
} from './notes/note-document';
export { noteSchema, type Note } from './notes/note.schema';
export { notesQuerySchema, type NotesQuery } from './notes/notes-query.schema';
export { updateNoteSchema, type UpdateNote } from './notes/update-note.schema';
export {
  createShoppingCategorySchema,
  getShoppingBuiltInCategoryLabels,
  getShoppingBuiltInCategoryPosition,
  SHOPPING_BUILT_IN_CATEGORY_IDS,
  SHOPPING_BUILT_IN_CATEGORY_KEYS,
  SHOPPING_BUILT_IN_CATEGORY_LABELS,
  SHOPPING_CATEGORY_KINDS,
  SHOPPING_CATEGORY_NAME_KEY_MAX_LENGTH,
  SHOPPING_CATEGORY_NAME_MAX_LENGTH,
  SHOPPING_OTHER_CATEGORY_ID,
  shoppingBuiltInCategoryKeySchema,
  shoppingCategoryKindSchema,
  shoppingCategoryListSchema,
  shoppingCategoryNameSchema,
  shoppingCategoryRouteParametersSchema,
  shoppingCategorySchema,
  updateShoppingCategorySchema,
  type CreateShoppingCategory,
  type ShoppingBuiltInCategoryKey,
  type ShoppingCategory,
  type ShoppingCategoryKind,
  type ShoppingCategoryList,
  type ShoppingCategoryRouteParameters,
  type UpdateShoppingCategory,
} from './shopping/shopping-category.schema';
export {
  createShoppingProductSchema,
  nextShoppingListUsage,
  SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH,
  SHOPPING_PRODUCT_NAME_MAX_LENGTH,
  shoppingProductListSchema,
  shoppingProductNameSchema,
  shoppingProductRouteParametersSchema,
  shoppingProductSchema,
  updateShoppingProductSchema,
  type CreateShoppingProduct,
  type ShoppingProduct,
  type ShoppingProductList,
  type ShoppingProductRouteParameters,
  type UpdateShoppingProduct,
} from './shopping/shopping-product.schema';
export {
  addShoppingListItemSchema,
  createShoppingListSchema,
  SHOPPING_LIST_ITEM_LIMIT,
  SHOPPING_LIST_NAME_MAX_LENGTH,
  SHOPPING_LIST_QUANTITY_MAX,
  SHOPPING_LIST_QUANTITY_MIN,
  shoppingListItemSchema,
  shoppingListNameSchema,
  shoppingListQuantitySchema,
  shoppingListRouteParametersSchema,
  shoppingListSchema,
  shoppingListSummaryListSchema,
  shoppingListSummarySchema,
  updateShoppingListSchema,
  type AddShoppingListItem,
  type CreateShoppingList,
  type ShoppingList,
  type ShoppingListItem,
  type ShoppingListRouteParameters,
  type ShoppingListSummary,
  type ShoppingListSummaryList,
  type UpdateShoppingList,
} from './shopping/shopping-list.schema';
export {
  createShoppingStoreProfileSchema,
  replaceShoppingStoreProfileOrderSchema,
  SHOPPING_STORE_PROFILE_NAME_MAX_LENGTH,
  shoppingStoreProfileCollectionSchema,
  shoppingStoreProfileNameSchema,
  shoppingStoreProfileRouteParametersSchema,
  shoppingStoreProfileSchema,
  shoppingStoreProfileSelectionSchema,
  updateShoppingStoreProfileSchema,
  type CreateShoppingStoreProfile,
  type ReplaceShoppingStoreProfileOrder,
  type ShoppingStoreProfile,
  type ShoppingStoreProfileCollection,
  type ShoppingStoreProfileRouteParameters,
  type ShoppingStoreProfileSelection,
  type UpdateShoppingStoreProfile,
} from './shopping/shopping-store-profile.schema';
export {
  createShoppingPresetSchema,
  replaceShoppingPresetEntriesSchema,
  SHOPPING_PRESET_ENTRY_LIMIT,
  SHOPPING_PRESET_LIMIT,
  SHOPPING_PRESET_NAME_MAX_LENGTH,
  shoppingPresetEntrySchema,
  shoppingPresetNameSchema,
  shoppingPresetRouteParametersSchema,
  shoppingPresetSchema,
  shoppingPresetSummaryListSchema,
  shoppingPresetSummarySchema,
  updateShoppingPresetSchema,
  type CreateShoppingPreset,
  type ReplaceShoppingPresetEntries,
  type ShoppingPreset,
  type ShoppingPresetEntry,
  type ShoppingPresetRouteParameters,
  type ShoppingPresetSummary,
  type ShoppingPresetSummaryList,
  type UpdateShoppingPreset,
} from './shopping/shopping-preset.schema';
export { normalizeShoppingDisplayText, toShoppingComparisonKey } from './shopping/shopping-text';
