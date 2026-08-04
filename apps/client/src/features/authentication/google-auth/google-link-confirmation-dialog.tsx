import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, registerRequestSchema, type LoginRequest } from '@nestra/contracts';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import type { GoogleAuthErrorKey } from './google-auth.types';

const linkConfirmationSchema = loginRequestSchema.extend({
  password: registerRequestSchema.shape.password,
});

type GoogleLinkConfirmationDialogProps = {
  readonly errorKey?: GoogleAuthErrorKey;
  readonly isVisible: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (request: LoginRequest) => Promise<void>;
};

export function GoogleLinkConfirmationDialog({
  errorKey,
  isVisible,
  onCancel,
  onConfirm,
}: GoogleLinkConfirmationDialogProps) {
  const { t } = useTranslation('auth');
  const theme = useNestraTheme();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(linkConfirmationSchema),
  });
  const submit = handleSubmit(onConfirm);
  const cancel = () => {
    reset();
    onCancel();
  };

  return (
    <ActionDialog
      description={t('google.link.description')}
      descriptionAccessory={
        <View style={styles.fields}>
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
          {errorKey ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
              {t(errorKey)}
            </Text>
          ) : null}
        </View>
      }
      dismissable={!isSubmitting}
      onDismiss={cancel}
      title={t('google.link.title')}
      visible={isVisible}
    >
      <Button disabled={isSubmitting} onPress={cancel}>
        {t('google.link.cancel')}
      </Button>
      <Button disabled={isSubmitting} loading={isSubmitting} onPress={() => void submit()}>
        {t('google.link.confirm')}
      </Button>
    </ActionDialog>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.supporting,
  },
  fields: {
    gap: spacing.sm,
  },
});
