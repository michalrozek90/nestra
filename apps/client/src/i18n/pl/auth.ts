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
  google: {
    or: 'lub',
    'sign-in': {
      label: 'Zaloguj się przez Google',
      accessibilityLabel: 'Zaloguj się do Nestry przez Google',
    },
    'sign-up': {
      label: 'Zarejestruj się przez Google',
      accessibilityLabel: 'Utwórz konto Nestra przez Google',
    },
    callback: {
      accessibilityLabel: 'Kończenie uwierzytelniania Google',
      completing: 'Kończenie uwierzytelniania Google…',
    },
    link: {
      title: 'Połącz istniejące konto',
      description:
        'Konto z tym adresem e-mail już istnieje. Zaloguj się jego adresem i hasłem, aby potwierdzić własność, a następnie ponownie zatwierdź Google, aby je połączyć.',
      confirm: 'Zaloguj i połącz Google',
      cancel: 'Nie teraz',
    },
    feedback: {
      linked: 'Google jest teraz połączone z Twoim kontem Nestra.',
      linkCancelled: 'Google nie zostało połączone. Zalogowano Cię za pomocą hasła.',
    },
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
    sessionStorageUnavailable:
      'Nestra nie mogła zapisać sesji na tym urządzeniu. Sprawdź dostęp do pamięci. Jeśli konto zostało właśnie utworzone, przejdź do logowania zamiast ponawiać rejestrację.',
    validationFailed: 'Sprawdź wprowadzone informacje i spróbuj ponownie.',
    serviceUnavailable:
      'Nestra nie może połączyć się z serwerem. Sprawdź połączenie i spróbuj ponownie.',
    google: {
      provider: 'Google nie mogło ukończyć uwierzytelniania. Spróbuj ponownie.',
      network:
        'Nestra nie może połączyć się z usługą uwierzytelniania. Sprawdź połączenie i spróbuj ponownie.',
      invalidCallback: 'Powrót z Google jest nieprawidłowy. Rozpocznij ponownie z Nestry.',
      expiredHandoff: 'Żądanie logowania przez Google wygasło. Rozpocznij ponownie.',
      usedHandoff: 'To żądanie logowania przez Google zostało już ukończone. Rozpocznij nowe.',
      emailUnverified:
        'Google nie przekazało zweryfikowanego adresu e-mail. Użyj innego konta Google.',
      emailMismatch:
        'Ten adres Google nie pasuje do adresu konta Nestra. Użyj właściwego konta Google.',
      identityConflict: 'Tego konta Google nie można połączyć z tym kontem Nestra.',
      unavailable: 'Logowanie przez Google jest chwilowo niedostępne. Spróbuj ponownie później.',
    },
    unexpected: 'Nie udało się ukończyć uwierzytelniania. Spróbuj ponownie.',
  },
} as const;
