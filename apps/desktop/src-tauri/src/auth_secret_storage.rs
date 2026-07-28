use keyring::{Entry, Error as KeyringError};

const AUTH_SECRET_SERVICE: &str = "com.michalrozek.nestra.auth";
const ACCESS_TOKEN_ACCOUNT: &str = "accessToken";
const REFRESH_TOKEN_ACCOUNT: &str = "refreshToken";

fn create_entry(account: &str) -> Result<Entry, String> {
    if account.is_empty() {
        return Err("auth secret account must not be empty".to_owned());
    }

    Entry::new(AUTH_SECRET_SERVICE, account).map_err(|error| error.to_string())
}

fn map_keyring_error(error: KeyringError) -> String {
    error.to_string()
}

#[tauri::command]
pub fn get_auth_secret(account: String) -> Result<Option<String>, String> {
    match create_entry(&account)?.get_password() {
        Ok(secret) => {
            if secret.is_empty() {
                return Err("stored auth secret must not be empty".to_owned());
            }
            Ok(Some(secret))
        }
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(map_keyring_error(error)),
    }
}

#[tauri::command]
pub fn set_auth_secret(account: String, secret: String) -> Result<(), String> {
    if secret.is_empty() {
        return Err("auth secret value must not be empty".to_owned());
    }

    create_entry(&account)?
        .set_password(&secret)
        .map_err(map_keyring_error)
}

#[tauri::command]
pub fn delete_auth_secret(account: String) -> Result<(), String> {
    match create_entry(&account)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(map_keyring_error(error)),
    }
}

#[tauri::command]
pub fn clear_auth_secrets() -> Result<(), String> {
    delete_auth_secret(ACCESS_TOKEN_ACCOUNT.to_owned())?;
    delete_auth_secret(REFRESH_TOKEN_ACCOUNT.to_owned())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{ACCESS_TOKEN_ACCOUNT, AUTH_SECRET_SERVICE, REFRESH_TOKEN_ACCOUNT};

    #[test]
    fn auth_secret_identifiers_are_stable() {
        assert_eq!(AUTH_SECRET_SERVICE, "com.michalrozek.nestra.auth");
        assert_eq!(ACCESS_TOKEN_ACCOUNT, "accessToken");
        assert_eq!(REFRESH_TOKEN_ACCOUNT, "refreshToken");
    }
}
