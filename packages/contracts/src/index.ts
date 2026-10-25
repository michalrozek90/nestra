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
export { normalizeShoppingDisplayText, toShoppingComparisonKey } from './shopping/shopping-text';
