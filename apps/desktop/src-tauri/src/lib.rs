mod auth_secret_storage;

#[cfg(desktop)]
use tauri::Manager;

#[cfg(all(debug_assertions, windows))]
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg(desktop)]
fn restore_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Deep-link delivery on Windows depends on this plugin running before every other plugin.
        builder = builder.plugin(tauri_plugin_single_instance::init(
            |app, _arguments, _cwd| {
                // The deep-link feature emits the URL event before this callback runs.
                restore_main_window(app);
            },
        ));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|_app| {
            #[cfg(all(debug_assertions, windows))]
            _app.deep_link().register_all()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth_secret_storage::get_auth_secret,
            auth_secret_storage::set_auth_secret,
            auth_secret_storage::delete_auth_secret,
            auth_secret_storage::clear_auth_secrets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nestra desktop application");
}
