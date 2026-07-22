import { zodResolver } from '@hookform/resolvers/zod';
import { registerRequestSchema } from '@nestra/contracts';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { registerAccount } from '@/infrastructure/auth/auth-api';
import { getAuthErrorTranslationKey } from '@/infrastructure/auth/auth-error';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

const registrationFormSchema = registerRequestSchema
  .extend({ passwordConfirmation: z.string().min(1) })
  .refine((request) => request.password === request.passwordConfirmation, {
    path: ['passwordConfirmation'],
  });

type RegistrationForm = z.infer<typeof registrationFormSchema>;

export default function RegisterScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const theme = useNestraTheme();
  const { completeAuthentication } = useAuth();
  const passwordInputRef = useRef<{ focus(): void } | null>(null);
  const passwordConfirmationInputRef = useRef<{ focus(): void } | null>(null);
  const registerMutation = useMutation({ mutationFn: registerAccount });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationForm>({
    defaultValues: { email: '', password: '', passwordConfirmation: '' },
    resolver: zodResolver(registrationFormSchema),
  });

  const submit = handleSubmit(async ({ email, password }) => {
    try {
      const session = await registerMutation.mutateAsync({ email, password });
      await completeAuthentication(session);
      router.replace('/notes');
    } catch {
      // The mutation exposes a localized, credential-safe error below.
    }
  });

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.formContainer}>
        <Header description={t('register.description')} title={t('register.title')} />

        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              accessibilityLabel={t('fields.email')}
              autoCapitalize="none"
              autoComplete="email"
              error={Boolean(errors.email)}
              keyboardType="email-address"
              label={t('fields.email')}
              mode="outlined"
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              returnKeyType="next"
              textContentType="emailAddress"
              value={value}
            />
          )}
        />
        {errors.email ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t('validation.email')}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              accessibilityLabel={t('fields.password')}
              autoCapitalize="none"
              autoComplete="new-password"
              error={Boolean(errors.password)}
              label={t('fields.password')}
              mode="outlined"
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={() => passwordConfirmationInputRef.current?.focus()}
              ref={(input: { focus(): void } | null) => {
                passwordInputRef.current = input;
              }}
              returnKeyType="next"
              secureTextEntry
              textContentType="newPassword"
              value={value}
            />
          )}
        />
        {errors.password ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t('validation.passwordLength')}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="passwordConfirmation"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              accessibilityLabel={t('fields.passwordConfirmation')}
              autoCapitalize="none"
              autoComplete="new-password"
              error={Boolean(errors.passwordConfirmation)}
              label={t('fields.passwordConfirmation')}
              mode="outlined"
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={() => void submit()}
              ref={(input: { focus(): void } | null) => {
                passwordConfirmationInputRef.current = input;
              }}
              returnKeyType="done"
              secureTextEntry
              textContentType="newPassword"
              value={value}
            />
          )}
        />
        {errors.passwordConfirmation ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t('validation.passwordConfirmation')}
          </Text>
        ) : null}

        {registerMutation.isError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t(getAuthErrorTranslationKey(registerMutation.error))}
          </Text>
        ) : null}

        <Button
          isDisabled={registerMutation.isPending}
          isLoading={registerMutation.isPending}
          label={t('register.submit')}
          onPress={() => void submit()}
        />
        <Button
          isDisabled={registerMutation.isPending}
          label={t('register.signIn')}
          onPress={() => router.push('/login')}
          variant="secondary"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.supporting,
  },
  formContainer: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: 520,
    width: '100%',
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
