export const enAuth = {
  fields: {
    email: 'Email address',
    password: 'Password',
    passwordConfirmation: 'Confirm password',
  },
  login: {
    title: 'Sign in',
    description: 'Use your Nestra account to continue.',
    submit: 'Sign in',
    createAccount: 'Create an account',
  },
  register: {
    title: 'Create account',
    description: 'Create an account to keep your information available across devices.',
    submit: 'Create account',
    signIn: 'Already have an account? Sign in',
  },
  google: {
    or: 'or',
    'sign-in': {
      label: 'Sign in with Google',
      accessibilityLabel: 'Sign in to Nestra with Google',
    },
    'sign-up': {
      label: 'Sign up with Google',
      accessibilityLabel: 'Create a Nestra account with Google',
    },
    callback: {
      accessibilityLabel: 'Completing Google authentication',
      completing: 'Completing Google authentication…',
    },
    link: {
      title: 'Link your existing account',
      description:
        'An account already uses this email address. Sign in with its email and password to confirm ownership, then approve Google again to link it.',
      confirm: 'Sign in and link Google',
      cancel: 'Not now',
    },
    feedback: {
      linked: 'Google is now linked to your Nestra account.',
      linkCancelled: 'Google was not linked. You are signed in with your password.',
    },
  },
  validation: {
    email: 'Enter a valid email address.',
    passwordRequired: 'Enter your password.',
    passwordLength: 'Use between 7 and 128 characters.',
    passwordConfirmation: 'The passwords must match.',
  },
  errors: {
    invalidCredentials: 'The email or password is incorrect.',
    emailAlreadyRegistered: 'An account already exists for this email address.',
    sessionExpired: 'Your session has expired. Sign in again.',
    sessionStorageUnavailable:
      'Nestra could not save the session on this device. Check storage access. If you just created an account, sign in instead of registering again.',
    validationFailed: 'Check the entered information and try again.',
    serviceUnavailable: 'Nestra cannot reach the server. Check the connection and try again.',
    google: {
      provider: 'Google could not complete authentication. Try again.',
      network:
        'Nestra could not reach the authentication service. Check the connection and try again.',
      invalidCallback: 'The Google return was invalid. Start again from Nestra.',
      expiredHandoff: 'The Google sign-in request expired. Start again.',
      usedHandoff: 'This Google sign-in request was already completed. Start a new one.',
      emailUnverified:
        'Google did not provide a verified email address. Use another Google account.',
      emailMismatch:
        'This Google email does not match your Nestra account email. Use the matching Google account.',
      identityConflict: 'This Google account cannot be linked to this Nestra account.',
      unavailable: 'Google sign-in is temporarily unavailable. Try again later.',
    },
    unexpected: 'Authentication could not be completed. Try again.',
  },
} as const;
