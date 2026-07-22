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
    unexpected: 'Authentication could not be completed. Try again.',
  },
} as const;
