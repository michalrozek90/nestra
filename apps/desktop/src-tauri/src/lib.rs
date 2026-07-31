mod auth_secret_storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            auth_secret_storage::get_auth_secret,
            auth_secret_storage::set_auth_secret,
            auth_secret_storage::delete_auth_secret,
            auth_secret_storage::clear_auth_secrets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nestra desktop application");
}
