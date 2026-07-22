import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, registerRequestSchema, type LoginRequest } from '@nestra/contracts';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { login } from '@/infrastructure/auth/auth-api';
import { getAuthErrorTranslationKey } from '@/infrastructure/auth/auth-error';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

const loginFormSchema = loginRequestSchema.extend({
  password: registerRequestSchema.shape.password,
});

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const theme = useNestraTheme();
  const { completeAuthentication } = useAuth();
  const passwordInputRef = useRef<{ focus(): void } | null>(null);
  const loginMutation = useMutation({ mutationFn: login });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(loginFormSchema),
  });

  const submit = handleSubmit(async (request) => {
    try {
      const session = await loginMutation.mutateAsync(request);
      await completeAuthentication(session);
      router.replace('/notes');
    } catch {
      // The mutation exposes a localized, credential-safe error below.
    }
  });

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.formContainer}>
        <Header description={t('login.description')} title={t('login.title')} />

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
              autoComplete="current-password"
              error={Boolean(errors.password)}
              label={t('fields.password')}
              mode="outlined"
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={() => void submit()}
              ref={(input: { focus(): void } | null) => {
                passwordInputRef.current = input;
              }}
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={value}
            />
          )}
        />
        {errors.password ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t('validation.passwordLength')}
          </Text>
        ) : null}

        {loginMutation.isError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t(getAuthErrorTranslationKey(loginMutation.error))}
          </Text>
        ) : null}

        <Button
          isDisabled={loginMutation.isPending}
          isLoading={loginMutation.isPending}
          label={t('login.submit')}
          onPress={() => void submit()}
        />
        <Button
          isDisabled={loginMutation.isPending}
          label={t('login.createAccount')}
          onPress={() => router.push('/register')}
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
