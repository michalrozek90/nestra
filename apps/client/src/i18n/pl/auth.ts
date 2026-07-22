export const plAuth = {
  fields: {
    email: 'Adres e-mail',
    password: 'Hasło',
    passwordConfirmation: 'Potwierdź hasło',
  },
  login: {
    title: 'Zaloguj się',
    description: 'Użyj konta Nestra, aby kontynuować.',
    submit: 'Zaloguj się',
    createAccount: 'Utwórz konto',
  },
  register: {
    title: 'Utwórz konto',
    description: 'Utwórz konto, aby korzystać ze swoich danych na różnych urządzeniach.',
    submit: 'Utwórz konto',
    signIn: 'Masz już konto? Zaloguj się',
  },
  validation: {
    email: 'Wpisz prawidłowy adres e-mail.',
    passwordRequired: 'Wpisz hasło.',
    passwordLength: 'Użyj od 7 do 128 znaków.',
    passwordConfirmation: 'Hasła muszą być identyczne.',
  },
  errors: {
    invalidCredentials: 'Adres e-mail lub hasło są nieprawidłowe.',
    emailAlreadyRegistered: 'Dla tego adresu e-mail istnieje już konto.',
    sessionExpired: 'Sesja wygasła. Zaloguj się ponownie.',
    validationFailed: 'Sprawdź wprowadzone informacje i spróbuj ponownie.',
    serviceUnavailable:
      'Nestra nie może połączyć się z serwerem. Sprawdź połączenie i spróbuj ponownie.',
    unexpected: 'Nie udało się ukończyć uwierzytelniania. Spróbuj ponownie.',
  },
} as const;
